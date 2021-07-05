import browser from 'webextension-polyfill';

import {Directions, FlipDirections, numOrientations} from "./tangram/directions";
import {arrayEq, clipAngle, evalVal, shuffleArray, generating} from "./tangram/helpers";
import {Tangram} from "./tangram/tangram";
import {IntAdjoinSqrt2} from "./tangram/intadjoinsqrt2";
import {Point} from "./tangram/point";
import {computeSegments, getAllPoints, Tan} from "./tangram/tan";
import {LineSegment} from "./tangram/lineSegement";
import {generateTangrams} from "./tangram/generator";
import optionsStorage from "./options/options-storage";

import logo from 'url:./logo.png';
import WebExtFeedbackPopup from "webext-feedback-popup";

/* Settings/letiables for generating yea */
let numTangrams = 1000;
let generated = [];
let chosen;

let firstGeneration = true;
/* letiables used during solving */
let currentTan = -1;
let move = false;
let mouseOffset = new Point(new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(0, 0));
let lastMouse = new Point(new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(0, 0));
let lastAngle = 0;
let hints = [0, 1, 2, 3, 4, 5, 6];
let numHints = 0;
let snapRange = 1.2;
let snapped = [false, false, false, false, false, false, false];
/* letiables for statistics */
let timer;
let minutes;
let seconds;
let rotations;
let translations;
let user;

let gameOutline;


/* Game logic - compute mouse coordinates */
let getMouseCoordinates = function (event) {
	let svg = document.getElementById("game");
	let pt = svg.createSVGPoint();
	if ('touches' in event) {
		let touch = event.changedTouches[0];
		pt.x = touch.clientX;
		pt.y = touch.clientY;
	} else {
		pt.x = event.clientX;
		pt.y = event.clientY;
	}
	/* Transform coordinates from pixels to coordinates inside the svg-element*/
	let globalPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
	return new Point(new IntAdjoinSqrt2(globalPoint.x, 0), new IntAdjoinSqrt2(globalPoint.y, 0));
};

let resetPieces = function () {
	let anchorBT1_G = new Point(new IntAdjoinSqrt2(72, -6), new IntAdjoinSqrt2(18.9, -7.5));
	let bigTriangle1_G = new Tan(0, anchorBT1_G, 0);
	let anchorBT2_G = new Point(new IntAdjoinSqrt2(78, 6), new IntAdjoinSqrt2(18.9, 4.5));
	let bigTriangle2_G = new Tan(0, anchorBT2_G, 4);
	let anchorM_G = new Point(new IntAdjoinSqrt2(72, -6), new IntAdjoinSqrt2(29.1, 7.5));
	let mediumTriangle_G = new Tan(1, anchorM_G, 0);
	let anchorST1_G = new Point(new IntAdjoinSqrt2(72, -6), new IntAdjoinSqrt2(26.1, 1.5));
	let smallTriangle1_G = new Tan(2, anchorST1_G, 0);
	let anchorST2_G = new Point(new IntAdjoinSqrt2(75, 0), new IntAdjoinSqrt2(26.1, 7.5));
	let smallTriangle2_G = new Tan(2, anchorST2_G, 4);
	let anchorS_G = new Point(new IntAdjoinSqrt2(78, 6), new IntAdjoinSqrt2(26.1, 7.5));
	let square_G = new Tan(3, anchorS_G, 4);
	let anchorP_G = new Point(new IntAdjoinSqrt2(60, 6), new IntAdjoinSqrt2(41.1, 7.5));
	let parallelogram_G = new Tan(5, anchorP_G, 0);
	gameOutline = [bigTriangle1_G, bigTriangle2_G, mediumTriangle_G, smallTriangle1_G, smallTriangle2_G, square_G, parallelogram_G];
};


/* Game logic - Show which action will be used if dragging is used */
let changeIconVisibility = function (showMove, showRotate) {
	move = !!showMove;
};

/* Game logic - Set the action that will be used if dragging is used based on the
 * proximity of the mouse to the vertices of the current tan */
let showAction = function (event) {
	/* If tan is already selected and we are not currently handling a touch event
	 * nothing has to be done */
	if (currentTan != -1 && !('touches' in event)) return;
	let target = event.currentTarget;
	let tanIndex = parseInt(target.id[target.id.length - 1]);
	let mouse = getMouseCoordinates(event);
	let points = gameOutline[tanIndex].getPoints();
	let rotate = false;
	/* Smaller rotate range for "small" tans */
	let rotateRange = (tanIndex > 2) ? 1.8 : 2.7;
	/* Action if rotate if the mouse is close to one the vertices of the tan */
	for (let pointId = 0; pointId < points.length; pointId++) {
		if (Math.abs(points[pointId].toFloatX() - mouse.toFloatX()) < rotateRange
			&& Math.abs(points[pointId].toFloatY() - mouse.toFloatY()) < rotateRange) {
			rotate = true;
			break;
		}
	}
	if (rotate) {
		changeIconVisibility(false, true);
	} else {
		changeIconVisibility(true, false);
	}
};

/* Game logic - Check if the tangram has already been solved */
let checkSolved = function () {
	let tangramFromPieces = new Tangram(gameOutline);
	/* Outline of the pieces and the chosen tangram have different length or the
	 * outline is undefined -> not solved */
	if (typeof tangramFromPieces.outline === 'undefined'
		|| generated[chosen].outline.length != tangramFromPieces.outline.length) {
		return false;
	}
	/* Check if the outlines are the same, when the tangram has been solved, the
	 * outlines have to match exactly due to snapping */
	let solved = true;
	sendMessage();
	for (let outlineId = 0; outlineId < generated[chosen].outline.length; outlineId++) {
		solved = solved && arrayEq(generated[chosen].outline[outlineId], tangramFromPieces.outline[outlineId], Point.comparePoints);
	}
	if (!solved) {
		return;
	}
	/* Also check if any of the segments intersect */
	let tanSegments = computeSegments(getAllPoints(gameOutline), gameOutline);
	for (let segmentId = 0; segmentId < tanSegments.length; segmentId++) {
		for (let otherSegmentsId = segmentId+1; otherSegmentsId < tanSegments.length; otherSegmentsId++) {
			if (tanSegments[segmentId].intersects(tanSegments[otherSegmentsId])) {
				return false;
			}
		}
	}
	/* Color the tan pieces and display some statistics about the game play */
	stopWatch();
	let tangramPieces = document.getElementsByClassName("tan");
	for (let tanIndex = 0; tanIndex < tangramPieces.length; tanIndex++) {
		tangramPieces[tanIndex].setAttributeNS(null, "fill", "#3299BB");
		tangramPieces[tanIndex].setAttributeNS(null, "opacity", "1.0");
	}
	let watch = document.getElementById("watch");
	watch.textContent = "";
	let line0 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
	line0.setAttributeNS(null, 'x', '66');
	line0.setAttributeNS(null, 'y', '24');
	line0.textContent = "You solved it";
	watch.appendChild(line0);
	let line1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
	line1.setAttributeNS(null, 'x', '66');
	line1.setAttributeNS(null, 'y', '27');
	line1.textContent = "in \uf017  " + (minutes ? (minutes > 9 ? minutes : "0" +
		minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds) + " with";
	watch.appendChild(line1);
	let line2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
	line2.setAttributeNS(null, 'x', '66');
	line2.setAttributeNS(null, 'y', '30');
	line2.textContent = "\uf047  " + translations + " and \uf01e  " + rotations;
	watch.appendChild(line2);
	/* Send statistics to server */
	// sendGame(user, minutes, seconds, numHints, translations, rotations, generated[chosen]);
};

/* Game logic - Sets every piece to the solution */
let setToSol = function () {
	for (let tanIndex = 0; tanIndex < 7; tanIndex++) {
		gameOutline[tanIndex] = generated[chosen].tans[tanIndex].dup();
		updateTanPiece(tanIndex);
	}
	sendMessage();
};

/* Game logic - Display the outline of one tan that has not been displayed before */
let hint = function () {
	/* Give hints in random order */
	if (numHints === 0) {
		hints = shuffleArray(hints);
	}
	if (numHints > 6) {
		return;
	}
	/* Display outline */
	let shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	shape.setAttributeNS(null, "points", generated[chosen].tans[hints[numHints]].toSVG());
	shape.setAttributeNS(null, "fill", 'none');
	shape.setAttributeNS(null, "stroke", "#00FFFF");
	shape.setAttributeNS(null, "stroke-width", "0.2");
	shape.setAttributeNS(null, "class", "hint");
	document.getElementById("game").appendChild(shape);
	numHints++;
};

/* Game logic - After a tan has been placed, snap to either other tans or the
 * outline of the tangram to be solved */
let snapToClosePoints = function () {
	if (currentTan === -1) {
		return;
	}
	let tanPoints = gameOutline[currentTan].getPoints();
	let currentTanPoints;
	let snap = false;
	/* Snap to the first point of a different tan that falls into the snapRange */
	for (let tanId = 0; tanId < 7; tanId++) {
		if (tanId === currentTan) continue;
		currentTanPoints = gameOutline[tanId].getPoints();
		for (let pointsId = 0; pointsId < tanPoints.length; pointsId++) {
			for (let currentPointsId = 0; currentPointsId < currentTanPoints.length; currentPointsId++) {
				if (Point.closePoint(tanPoints[pointsId], currentTanPoints[currentPointsId], snapRange)) {
					/* The tan that is being snapped to has not been snapped to the outline yet
					 * (therefore does not have exact coordinates yet) -> simply compute
					 * difference vector and add it to the anchor */
					if (!snapped[tanId]) {
						let direction = currentTanPoints[currentPointsId].dup().subtract(tanPoints[pointsId]);
						gameOutline[currentTan].anchor.add(direction);
					} else {
						/* The tan that is being snapped to has already been snapped
						 * to the outline -> update the anchor to that it has exact
						 * coordinates as well (involves some direction computation
						 * if the points that snap to each other are not the anchors */
						gameOutline[currentTan].anchor = currentPointsId === 0 ?
							gameOutline[tanId].anchor.dup() : gameOutline[tanId].anchor.dup().add(
								Directions[gameOutline[tanId].tanType][gameOutline[tanId]
									.orientation][currentPointsId - 1]);
						if (pointsId != 0) {
							gameOutline[currentTan].anchor.subtract(
								Directions[gameOutline[currentTan].tanType]
									[gameOutline[currentTan].orientation][pointsId - 1]);
						}
						snapped[currentTan] = true;
					}
					snap = true;
					break;
				}
			}
			if (snap) {
				break;
			}
		}
		if (snap) {
			break;
		}
	}
	/* Places tan has not snapped to any other tan -> try snapping to the
	 * outline in the same manner */
	if (!snap) {
		for (let pointsId = 0; pointsId < tanPoints.length; pointsId++) {
			for (let outlineId = 0; outlineId < generated[chosen].outline.length; outlineId++) {
				for (let currentPointsId = 0; currentPointsId < generated[chosen].outline[outlineId].length; currentPointsId++) {
					if (Point.closePoint(tanPoints[pointsId], generated[chosen].outline[outlineId][currentPointsId], snapRange)) {
						/*let direction = generated[chosen].outline[outlineId][currentPointsId].dup().subtract(tanPoints[pointsId]);
						 gameOutline[currentTan].anchor.add(direction);*/
						gameOutline[currentTan].anchor = generated[chosen].
							outline[outlineId][currentPointsId].dup();
						if (pointsId != 0) {
							gameOutline[currentTan].anchor.subtract(
								Directions[gameOutline[currentTan].tanType]
									[gameOutline[currentTan].orientation][pointsId - 1]);
						}
						snap = true;
						/* The placed tan is now snapped to the outline */
						snapped[currentTan] = true;
						break;
					}
				}
			}
			if (snap) {
				break;
			}
		}
	}
	updateTanPiece(currentTan);
};

/* Game logic - After a tan has been rotated, snap to the closest 45 degree rotation */
let snapToClosestRotation = function (mouse) {
	if (currentTan === -1) {
		return;
	}
	let tanCenter = gameOutline[currentTan].center();
	/* Difference between angle before rotation started and now */
	let currentAngle = clipAngle(lastAngle - new LineSegment(tanCenter,
		gameOutline[currentTan].anchor).angleTo(new LineSegment(tanCenter, mouse)));
	currentAngle = Math.round(currentAngle / 45);
	gameOutline[currentTan].orientation = (gameOutline[currentTan].orientation + currentAngle) % numOrientations;
	gameOutline[currentTan].anchor.subtract(tanCenter).rotate(45 * currentAngle).add(tanCenter);
	rotations++;
	updateTanPiece(currentTan);
};

/* Game logic - Update the svg of the tan with the given index, so that the svg
 * matches the internal representation (again) */
let updateTanPiece = function (tanIndex) {
	if (tanIndex < 0) {
		return;
	}
	let tanId = "piece" + tanIndex;
	document.getElementById(tanId).setAttribute("points", gameOutline[tanIndex].toSVG());
};

/* Game logic - Update the svg of the tan with the given index during rotation,
 * since angles other than multiples of 45 degrees occur, the internal tan
 * representation with just anchor and orientation can not be used and the points
 * have to be calculated from the points at the last orientation which are then
 * rotated */
let updateTanPieceRotation = function (tanIndex, angle) {
	if (tanIndex < 0) {
		return;
	}
	let tanId = "piece" + tanIndex;
	let tanCenter = gameOutline[tanIndex].center();
	let tan = document.getElementById(tanId);
	let points = gameOutline[tanIndex].getPoints();
	let pointsString = "";
	for (let pointId = 0; pointId < points.length; pointId++) {
		points[pointId].subtract(tanCenter).rotate(angle).add(tanCenter);
		pointsString += points[pointId].toFloatX() + ", " + points[pointId].toFloatY() + " ";
	}
	tan.setAttributeNS(null, "points", pointsString);
};

/* Game logic - Increase the orientation of the tan for which the event fired, if
 * the mouse coordinates have changed only very little since the selection (mousedown) */
let rotateTan = function (event) {
	let target = event.currentTarget;
	let tanIndex = parseInt(target.id[target.id.length - 1]);
	// console.log("clicked: " + tanIndex);
	let mouse = getMouseCoordinates(event);
	let mouseMove = lastMouse.dup().subtract(mouse);
	if (Math.abs(mouseMove.toFloatX()) < 0.25 && Math.abs(mouseMove.toFloatY()) < 0.25) {
		/* console.log("rotated: " + tanIndex); */
		gameOutline[tanIndex].orientation = (gameOutline[tanIndex].orientation + 1) % numOrientations;
		gameOutline[tanIndex].anchor.subtract(mouse).rotate(45).add(mouse);
		updateTanPiece(tanIndex);
		rotations++;
	}
};

/* Game logic - Select a tan as the current one, which is then moved/rotated if
 * the mouse moves (mousedown), update all "last states" in this function */
let selectTan = function (event) {
	let target = event.currentTarget;
	let tanIndex = parseInt(target.id[target.id.length - 1]);
	/* Show that this tan is active by "removing" border */
	document.getElementById("piece" + tanIndex).setAttributeNS(null, "stroke-width", "0.22");
	//document.getElementById("piece" + tanIndex).setAttributeNS(null, "opacity", "0.7");
	//console.log("selected: " + tanIndex);
	currentTan = tanIndex;
	let mouse = getMouseCoordinates(event);
	lastMouse = mouse.dup();
	let tanCenter = gameOutline[currentTan].center();
	lastAngle = new LineSegment(tanCenter, gameOutline[currentTan].anchor).angleTo(
		new LineSegment(tanCenter, lastMouse));
	mouseOffset = mouse.subtract(gameOutline[tanIndex].anchor);
};

/* Game logic - Deselect a tan when finishing a move/rotate action, snapping to
 * rotations/points is handled here */
let deselectTan = function (event) {
	if (!move) {
		snapToClosestRotation(getMouseCoordinates(event));
	} else {
		translations += 1;
	}
	if (currentTan !== -1) {
		snapped[currentTan] = false;
		/* Show that tan is not active anymore */
		document.getElementById("piece" + currentTan).setAttributeNS(null, "stroke-width", "0.1");
		//document.getElementById("piece" + currentTan).setAttributeNS(null, "opacity", "0.8");
	}
	snapToClosePoints();
	currentTan = -1;
	mouseOffset = new Point(new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(0, 0));
	checkSolved();
	/* Do not fire deselect on parent element as well */
	event.stopPropagation();
};

/* Game logic - move or rotate tan (mousemove) */
let moveTan = function (event) {
	let mouse = getMouseCoordinates(event);
	if (currentTan > -1) {
		if (move) {
			gameOutline[currentTan].anchor = mouse.subtract(mouseOffset);
			updateTanPiece(currentTan);
		} else {
			let tanCenter = gameOutline[currentTan].center();
			let currentAngle = clipAngle(lastAngle - new LineSegment(tanCenter,
				gameOutline[currentTan].anchor).angleTo(
				new LineSegment(tanCenter, mouse)));
			updateTanPieceRotation(currentTan, currentAngle);
		}
	}
};

/* Watch - stop watch -> cancel callback */
let stopWatch = function () {
	clearTimeout(timer);
};

/* Watch - Increase seconds and update watch text */
let updateWatch = function (hintTime, solTime) {
	seconds++;
	if (seconds >= 60) {
		seconds = 0;
		minutes++;
	}
	let watch = document.getElementById("watch");
	watch.textContent = "\uf017  " + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds);

	const totalTime = minutes*60+seconds;
	if(totalTime >= hintTime && hintTime > 0) {
		hint();
		hintTime = 0;
	}
	if(totalTime >= solTime && solTime > 0) {
		setToSol();
		stopWatch();
		return;
	}

	/* Update watch again in one second */
	timer = setTimeout(() => updateWatch(hintTime, solTime), 1000);
};

/* Watch - Start watch -> set seconds and minutes to 0 */
let startWatch = async function () {
	let watch = document.getElementById("watch");
	watch.textContent = "\uf017  " + "00:00";
	minutes = 0;
	seconds = 0;

	const options = await optionsStorage.getAll();
	const hintTime = options.hintTime;
	const solTime = options.solutionTime;

	/* Update watch again in one second */
	timer = setTimeout(() => updateWatch(hintTime, solTime), 1000);
};



/* Game logic - Show the tan pieces and add touch and mouse event listeners to
 * the tans */
let addTangramPieces = function () {
	for (let tanIndex = 0; tanIndex < gameOutline.length; tanIndex++) {
		let shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		let id = "piece" + tanIndex;
		shape.setAttributeNS(null, "id", id);
		shape.setAttributeNS(null, "class", "tan");
		shape.setAttributeNS(null, "points", gameOutline[tanIndex].toSVG());
		shape.setAttributeNS(null, "fill", '#FF9900');
		shape.setAttributeNS(null, "opacity", "0.8");
		shape.setAttributeNS(null, "stroke", "#000000");
		shape.setAttributeNS(null, "stroke-width", "0.1");
		document.getElementById("game").appendChild(shape);
	}
	let tangramPieces = document.getElementsByClassName("tan");
	for (let tanIndex = 0; tanIndex < tangramPieces.length; tanIndex++) {
		tangramPieces[tanIndex].addEventListener('click', rotateTan);
		tangramPieces[tanIndex].addEventListener('mousedown', selectTan);
		tangramPieces[tanIndex].addEventListener('mouseup', deselectTan);
		tangramPieces[tanIndex].addEventListener('mouseover', showAction);
		tangramPieces[tanIndex].addEventListener('mousemove', showAction);
		tangramPieces[tanIndex].addEventListener('mouseout', function () {
			if (currentTan === -1) changeIconVisibility(false, false);
		});
		tangramPieces[tanIndex].addEventListener('touchstart', function (event) {
			selectTan(event);
			showAction(event);
		});
		tangramPieces[tanIndex].addEventListener('touchend', function (event) {
			//event.preventDefault();
			deselectTan(event);
		});
		tangramPieces[tanIndex].addEventListener('touchmove', function (event) {
			event.preventDefault();
			moveTan(event);
		});
	}
	document.getElementById("game").addEventListener('mousemove', moveTan);
	document.getElementById("game").addEventListener('mouseup', deselectTan);
	/* Prevent other touch events on game (that are not inside a tan */
	document.getElementById("game").addEventListener('touchmove', function (event) {
		event.preventDefault();
	});
};

/* Game logic - Add icons for showing current action and watch */
let addIcons = function () {
	let moveIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
	moveIcon.setAttributeNS(null, "x", "69");
	moveIcon.setAttributeNS(null, "y", "57.9");
	moveIcon.setAttributeNS(null, "font-size", "2.7");
	moveIcon.setAttributeNS(null, "fill", "#E9E9E9");
	moveIcon.setAttributeNS(null, "id", "move");
	moveIcon.setAttributeNS(null, "display", "none");
	moveIcon.textContent = "\uf047";
	document.getElementById("game").appendChild(moveIcon);
	let rotateIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
	rotateIcon.setAttributeNS(null, "x", "69");
	rotateIcon.setAttributeNS(null, "y", "57.9");
	rotateIcon.setAttributeNS(null, "font-size", "2.7");
	rotateIcon.setAttributeNS(null, "fill", "#E9E9E9");
	rotateIcon.setAttributeNS(null, "id", "rotate");
	rotateIcon.setAttributeNS(null, "display", "none");
	rotateIcon.textContent = "\uf01e";
	document.getElementById("game").appendChild(rotateIcon);
	let watch = document.createElementNS("http://www.w3.org/2000/svg", "text");
	watch.setAttributeNS(null, "x", "3");
	watch.setAttributeNS(null, "y", "57.9");
	watch.setAttributeNS(null, "fill", "#f9f9f9");
	watch.setAttributeNS(null, "id", "watch");
	watch.setAttributeNS(null, "font-size", "2.7");
	watch.textContent = "\uf017  " + "00:00";
	document.getElementById("game").appendChild(watch);
};

/* Game logic - Add button for flipping parallelogram */
let addFlipButton = function () {
	let button = document.createElementNS("http://www.w3.org/2000/svg", "g");
	button.setAttributeNS(null, "class", "flip");
	button.setAttributeNS(null, "transform", "translate (" + 70.5 + ", " + 52.5 + ")" + "scale(" + 0.3 + "," + 0.3 + ")");
	let background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	background.setAttributeNS(null, "x", "10.5");
	background.setAttributeNS(null, "y", "10.5");
	background.setAttributeNS(null, "width", "45");
	background.setAttributeNS(null, "height", "9");
	background.setAttributeNS(null, "rx", "3.0");
	background.setAttributeNS(null, "ry", "3.0");
	background.setAttributeNS(null, "fill", '#E9E9E9');
	button.appendChild(background);
	let arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	arrow.setAttributeNS(null, "points", "30,15 31.5,13.5, 31.5,14.4, 34.5,14.4, " +
		"34.5,13.5, 36,15, 34.5,16.5, 34.5,15.6 31.5,15.6 31.5,16.5");
	arrow.setAttributeNS(null, "fill", '#BCBCBC');
	button.appendChild(arrow);
	let anchorL = new Point(new IntAdjoinSqrt2(12, 0), new IntAdjoinSqrt2(18, 0));
	let parallelogramL = new Tan(5, anchorL, 0);
	let parallelogramElementL = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	parallelogramElementL.setAttributeNS(null, "points", parallelogramL.toSVG());
	parallelogramElementL.setAttributeNS(null, "fill", '#BCBCBC');
	parallelogramElementL.setAttributeNS(null, "stroke", "#BCBCBC");
	parallelogramElementL.setAttributeNS(null, "stroke-width", "0.3");
	button.appendChild((parallelogramElementL));
	let anchorR = new Point(new IntAdjoinSqrt2(36, 0), new IntAdjoinSqrt2(12, 0));
	let parallelogramR = new Tan(4, anchorR, 0);
	let parallelogramElementR = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	parallelogramElementR.setAttributeNS(null, "points", parallelogramR.toSVG());
	parallelogramElementR.setAttributeNS(null, "fill", '#BCBCBC');
	parallelogramElementR.setAttributeNS(null, "stroke", "#BCBCBC");
	parallelogramElementR.setAttributeNS(null, "stroke-width", "0.3");
	button.appendChild((parallelogramElementR));
	document.getElementById("game").appendChild(button);
	let flipElements = document.getElementsByClassName("flip")[0].childNodes;
	for (let flipIndex = 0; flipIndex < flipElements.length; flipIndex++) {
		flipElements[flipIndex].addEventListener("click", flipParallelogram);
		/* Change color on hover */
		flipElements[flipIndex].addEventListener("mouseover", function () {
			//("mousein");
			document.getElementsByClassName("flip")[0].firstElementChild.setAttributeNS(null, "fill", '#666666');
		});
		flipElements[flipIndex].addEventListener("mouseout", function () {
			// console.log("mouseOut");
			document.getElementsByClassName("flip")[0].firstElementChild.setAttributeNS(null, "fill", '#E9E9E9');
		});
	}
};

/* Game logic - flip parallelogram (triggered by click on button) */
let flipParallelogram = function () {
	/* Parallelogram has index 6, (5 - tan type) is 0 or 1*/
	gameOutline[6].anchor = gameOutline[6].anchor.add(FlipDirections[5 - gameOutline[6].tanType][gameOutline[6].orientation]);
	gameOutline[6].tanType = gameOutline[6].tanType === 4 ? 5 : 4;
	/* Orientation 0 stays 0, all other change to 8 - current orientation */
	gameOutline[6].orientation = gameOutline[6].orientation === 0 ? 0 : 8 - gameOutline[6].orientation;
	updateTanPiece(6);
	checkSolved();
};

/* Parse jsonString of an array of tans into a tangram */
let parseTanArray = function (jsonString) {
	let tangram = JSON.parse(jsonString);
	let tans = [];
	for (let index = 0; index < 7; index++) {
		let currentTan = tangram[index];
		let anchor = new Point(new IntAdjoinSqrt2(currentTan.anchor.x.coeffInt,
			currentTan.anchor.x.coeffSqrt), new IntAdjoinSqrt2(currentTan.anchor.y.coeffInt,
			currentTan.anchor.y.coeffSqrt));
		tans.push(new Tan(currentTan.tanType, anchor, currentTan.orientation));
	}
	return new Tangram(tans);
};

// FUCKING HELL
let changeTangramVisibility = function (hide) {
	let tangramClass = document.getElementsByClassName("tangram");
	for (let i = 0; i < tangramClass.length; i++) {
		tangramClass[i].style.display = hide ? 'none' : 'block';
	}
	if (!evalVal){
		/* Show game buttons when hiding tangrams and regenerate button otherwise */
		document.getElementById("generate").style.display = hide ? 'none' : 'inline-block';
		//document.getElementById("select").style.display = hide ? 'inline-block' : 'none';
		document.getElementById("set").style.display = hide ? 'inline-block' : 'none';
		//document.getElementById("hint").style.display = hide ? 'inline-block' : 'none';
		//document.getElementById("sol").style.display = hide ? 'inline-block' : 'none';
	}
};

/* After generating is finished: show the first 6 tangrams */
let addTangrams = function () {
	/*let failTangram = '[{"tanType":0,"anchor":{"x":{"coeffInt":39,"coeffSqrt":-12},"y":{"coeffInt":39,"coeffSqrt":0}},"orientation":6},{"tanType":0,"anchor":{"x":{"coeffInt":21,"coeffSqrt":0},"y":{"coeffInt":21,"coeffSqrt":0}},"orientation":7},{"tanType":1,"anchor":{"x":{"coeffInt":33,"coeffSqrt":0},"y":{"coeffInt":21,"coeffSqrt":0}},"orientation":6},{"tanType":2,"anchor":{"x":{"coeffInt":33,"coeffSqrt":0},"y":{"coeffInt":45,"coeffSqrt":0}},"orientation":5},{"tanType":2,"anchor":{"x":{"coeffInt":21,"coeffSqrt":0},"y":{"coeffInt":45,"coeffSqrt":0}},"orientation":5},{"tanType":3,"anchor":{"x":{"coeffInt":33,"coeffSqrt":0},"y":{"coeffInt":45,"coeffSqrt":0}},"orientation":3},{"tanType":5,"anchor":{"x":{"coeffInt":33,"coeffSqrt":0},"y":{"coeffInt":21,"coeffSqrt":0}},"orientation":2}]';
	failTangram = parseTanArray(failTangram);
	generated[0] = failTangram;*/
	/* Center the tangrams */
	for (let tanId = 0; tanId < 6; tanId++) {
		generated[tanId].positionCentered();
	}

	generated[0].toSVGOutline("first0");
	generated[1].toSVGOutline("second1");

	generated[2].toSVGOutline("third2");
	generated[3].toSVGOutline("fourth3");

	generated[4].toSVGOutline("fifth4");
	generated[5].toSVGOutline("sixth5");

	/*generated[0].toSVGTans("first0",false);
	 generated[1].toSVGTans("second1",false);

	 generated[2].toSVGTans("third2",false);
	 generated[3].toSVGTans("fourth3",false);

	 generated[4].toSVGTans("fifth4",false);
	 generated[5].toSVGTans("sixth5",false);*/
};

/* Start generating process in a web worker */
let startGenerator = function () {
	// 1
	const before = performance.now();
	const jsonTans = generateTangrams(50);
	const after = performance.now();
	console.log(after-before+"ms to generate");

	// 2
	generating.val = false;
	jsonTans.forEach(el =>
		generated.push(parseTanArray(el))
	);

	// 3
	addTangrams();
	firstGeneration = false;
};

window.onload = function () {
	const modal = optionsStorage.getAll().
		then(
			data => {
				const idate = new Date(data.installDate);
				const fbm = new WebExtFeedbackPopup({
					window: window,
					headline: "Enjoying PuzzleBlocker?",
					text: `<div class="fbm-custom-text">
						<p>Do you enjoy using PuzzleBlocker or have <br>some suggestions to improve it?</p> 
						<p>Give us your feedback and a rating by visiting the link below.</p> 
						<p>Thank you!</p>
						</div>`,
					installDate: idate,
					frequency: 2,
					theme: "light",
					timeout: (7*24*1000*60*60),
					logo: logo,
					storeLinks: {
						chrome: "https://chrome.google.com/webstore/detail/puzzleblocker/naomldldmhjaaomjbgldgefgjcidhbki",
						firefox: "https://addons.mozilla.org/de/firefox/addon/puzzleblocker/"
					}
				});
			})
		.catch(error => console.log(error));

	/* Provide fallBack if Workers or inline SVG are not supported */
	if (typeof SVGRect === "undefined" || !window.Worker) {
		/* Show Browser fallback PNG */
		return;
	}
	//addLoading();
	chosen = 0;
	resetPieces();
	startGenerator();
	changeTangramVisibility(false);
	/* Show larger version of the chosen tangram */
	let tangramClass = document.getElementsByClassName("tangram");
	for (let i = 0; i < tangramClass.length; i++) {
		tangramClass[i].addEventListener('click', function (event) {
			changeTangramVisibility(true);
			let sourceId;
			let target = event.currentTarget;
				sourceId = target.id;
			/* Prevent error when click event fires on content (?) */
			if (sourceId === 'content') {
				return;
			}
			//console.log(event.currentTarget)
			chosen = i;
			generated[i].toSVGOutline("game");
			//generated[chosen].toSVGTans("game");
			document.getElementById("game").style.display = "block";
			addTangramPieces();
			addFlipButton();
			addIcons();
			rotations = 0;
			translations = 0;
			startWatch();
			/* Send choice to server */
			//sendChoice(user, chosen, generated.slice(0, 6));
		});
	}

	document.getElementById("generate").addEventListener('click', function () {
		/* Hide tangrams and generate new tangrams */
		changeTangramVisibility(false);
		generated = [];
		//addLoading();
		startGenerator();
		resetPieces();
	});

	document.getElementById("select").addEventListener('click', function () {
		document.getElementById("game").style.display = 'none';
		let gameNode = document.getElementById('game');
		while (gameNode.firstChild) {
			gameNode.removeChild(gameNode.firstChild);
		}
		/* Show tangrams again and resest game letiables */
		changeTangramVisibility(false);
		resetPieces();
		stopWatch();
		hints = [0, 1, 2, 3, 4, 5, 6];
		numHints = 0;
		snapped = [false, false, false, false, false, false, false];
	});

	document.getElementById("set").addEventListener('click', function () {
		/* Reset everything */
		resetPieces();
		for (let tanIndex = 0; tanIndex < gameOutline.length; tanIndex++) {
			updateTanPiece(tanIndex);
		}
		rotations = 0;
		translations = 0;
		hints = [0, 1, 2, 3, 4, 5, 6];
		numHints = 0;
		snapped = [false, false, false, false, false, false, false];
		let hintElements = document.getElementsByClassName("hint");
		while (hintElements.length > 0) {
			hintElements[0].parentNode.removeChild(hintElements[0]);
		}
		let tangramPieces = document.getElementsByClassName("tan");
		for (let tanIndex = 0; tanIndex < tangramPieces.length; tanIndex++) {
			tangramPieces[tanIndex].setAttributeNS(null, "fill", "#FF9900");
			tangramPieces[tanIndex].setAttributeNS(null, "opacity", "0.8");
		}
	});

	document.getElementById("hint").addEventListener('click', function () {
		hint();
	});

	document.getElementById("sol").addEventListener('click', function () {
		setToSol();
		/* Change color of the tan pieces */
		let tangramPieces = document.getElementsByClassName("tan");
		for (let tanIndex = 0; tanIndex < tangramPieces.length; tanIndex++) {
			tangramPieces[tanIndex].setAttributeNS(null, "fill", "#3299BB");
			tangramPieces[tanIndex].setAttributeNS(null, "opacity", "1.0");
		}
		/* Hide watch */
		stopWatch();
		let watch = document.getElementById("watch");
		while (watch.firstChild) {
			watch.removeChild(watch.firstChild);
		}
	});

	new IntAdjoinSqrt2(42,6).compare(new IntAdjoinSqrt2(30,12));

}
const sendMessage = async function() {
	const tab = await browser.tabs.getCurrent();
	const msg = browser.runtime.sendMessage(tab.id)
		.then(console.log)
		.catch(console.log)
}
