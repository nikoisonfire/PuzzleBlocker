import {eliminateDuplicates, evalVal, numberEq, shuffleArray} from "./helpers";
import {computeBoundingBox, containsPoint, getAllPoints, Tan} from "./tan";
import {Directions, numOrientations, SegmentDirections} from "./directions";
import {compareTangrams, Tangram} from "./tangram";
import {LineSegment} from "./lineSegement";
import {Point} from "./point";
import {IntAdjoinSqrt2} from "./intadjoinsqrt2";

/* Maximum range in x/y a tangram can have, maximum it should be set to is 60 */
const range = new IntAdjoinSqrt2(50, 0);
/* Addend by which "probability" of an orientation is increased when segments
 * align */
// NOTE: Higher number -> Better connectivity
const increaseProbability = 500;

const checkNewTan = function (currentTans, newTan) {
	let contains;
	let tansId;
	/* For each point of the new piece, check if it overlaps with already placed
		 * tans */
	const points = newTan.getPoints();
	/* Use inside points to detect exact alignment of one piece in another */
	const allTanPoints = points.concat(newTan.getInsidePoints());
	for (tansId = 0; tansId < currentTans.length; tansId++) {
		let pointId;
		let currentPoints = currentTans[tansId].getPoints();
		let onSegmentCounter = 0;
		for (pointId = 0; pointId < allTanPoints.length; pointId++) {
			contains = containsPoint(currentPoints, allTanPoints[pointId]);
			if (contains === 1) {
				return false;
			} else if (contains === 0) {
				onSegmentCounter++;
			}
		}
		/* If more than 3 points of the new tan lie on one of the already placed
		 * tans, there must be an overlap */
		if (onSegmentCounter >= 3) {
			return false;
		}
		/* Apply the same check the other way around: and already placed piece
		 * lies inside the new piece */
		onSegmentCounter = 0;
		currentPoints = currentPoints.concat(currentTans[tansId].getInsidePoints());
		for (pointId = 0; pointId < currentPoints.length; pointId++) {
			contains = containsPoint(points, currentPoints[pointId]);
			if (contains === 1) {
				return false;
			} else if (contains === 0) {
				onSegmentCounter++;
			}
		}
		if (onSegmentCounter >= 3) {
			return false;
		}
	}
	/* Check if any of the segments of the already placed tans  is intersected
	 * by any of the line segments of the new tan */
	const tanSegments = newTan.getSegments();
	for (let segmentId = 0; segmentId < tanSegments.length; segmentId++) {
		for (tansId = 0; tansId < currentTans.length; tansId++) {
			const otherSegments = currentTans[tansId].getSegments();
			for (let otherSegmentsId = 0; otherSegmentsId < otherSegments.length; otherSegmentsId++) {
				if (tanSegments[segmentId].intersects(otherSegments[otherSegmentsId])) {
					return false;
				}
			}
		}
	}
	/* Check if placement of newTan results in a tangram with a to large range
	 * assuming that tangrams with a too large range are not interesting */
	const newTans = currentTans.slice(0);
	newTans[currentTans.length] = newTan;
	const boundingBox = computeBoundingBox(newTans);
	if (boundingBox[2].dup().subtract(boundingBox[0]).compare(range) > 0
		|| boundingBox[3].dup().subtract(boundingBox[1]).compare(range) > 0) {
		return false;
	}
	return true;
};

/* Function to randomly generate a tangram by sampling orientation at the beginning */
const generateTangram = function () {
	let tanId;
	/* Generate an order in which the tan pieces are to be placed and an orientation
		 * for each piece */
	const flipped = Math.floor(Math.random() * 2);
	let tanOrder = [0, 0, 1, 2, 2, 3, 4 + flipped];
	console.log(tanOrder);
	tanOrder = shuffleArray(tanOrder);
	const orientations = [];
	for (tanId = 0; tanId < 7; tanId++) {
		orientations[tanId] = Math.floor((Math.random() * numOrientations));
	}
	/* Place the first tan, as defined in tanOrder, at the center the drawing space */
	const tans = [];
	let anchor = new Point(new IntAdjoinSqrt2(30, 0), new IntAdjoinSqrt2(30, 0));
	tans[0] = new Tan(tanOrder[0], anchor, orientations[0]);
	/* For each remaining piece to be placed, determine one of the points of the
	 * outline of the already placed pieces as the connecting point to the new
	 * piece */
	for (tanId = 1; tanId < 7; tanId++) {
		const allPoints = getAllPoints(tans);
		let tanPlaced = false;
		let counter = 0;
		while (!tanPlaced) {
			anchor = allPoints[Math.floor(Math.random() * allPoints.length)].dup();
			/* Try each possible point of the new tan as a connecting points and
			 * take the first one that does not result in an overlap */
			let pointId = 0;
			let pointOrder = (tanOrder[tanId] < 3) ? [0, 1, 2] : [0, 1, 2, 3];
			pointOrder = shuffleArray(pointOrder);
			do {
				let newTan;
				/* If the connecting point is not the anchor, the anchor position
				 * has to be calculated from the direction vectors for that tan
				 * type and orientation */
				if (pointOrder[pointId] === 0) {
					newTan = new Tan(tanOrder[tanId], anchor, orientations[tanId]);
				} else {
					const tanAnchor = anchor.dup().subtract(Directions[tanOrder[tanId]]
						[orientations[tanId]][pointOrder[pointId] - 1]);
					newTan = new Tan(tanOrder[tanId], tanAnchor, orientations[tanId]);
				}
				/* Place the tan if it does not overlap with already placed tans */
				if (checkNewTan(tans, newTan)) {
					tans[tanId] = newTan;
					tanPlaced = true;
				}
				pointId++;
			} while (!tanPlaced && pointId < ((tanOrder[tanId] < 3) ? 3 : 4));
			/* Try again if process has run into infinity loop -> choose new
			 * connecting point */
			counter++;
			if (counter > 100) {
				console.log("Infinity loop!");
				return generateTangram();
			}
		}
	}
	return new Tangram(tans);
};

/* Given an array of values, normalize the values so that sum of all values is 1*/
const normalizeProbability = function (distribution) {
	let index;
	let sum = 0;
	for (index = 0; index < distribution.length; index++) {
		sum += distribution[index];
	}
	if (numberEq(sum, 0)) return;
	for (index = 0; index < distribution.length; index++) {
		distribution[index] /= sum;
	}
	return distribution;
};

/* For a given number of already placed tans and a point at which a new tan is
 * supposed to be places, compute in which orientations segments align of already
 * placed tans align with segments of the new tan and increase the probability
 * of those tans accordingly */
const computeOrientationProbability = function (tans, point, tanType, pointId, allSegments) {
	let segmentId;
	const distribution = [];
	const segmentDirections = [];
	/* Get directions of the segments that are adjacent with the given connecting
	 * point in a way that the directions point to the respective other point */
	for (segmentId = 0; segmentId < allSegments.length; segmentId++) {
		if (allSegments[segmentId].point1.eq(point)) {
			segmentDirections.push(allSegments[segmentId].direction());
		} else if (allSegments[segmentId].point2.eq(point)) {
			segmentDirections.push(allSegments[segmentId].direction().neg());
		}
	}
	/* Segments align is the direction vectors are a multiple of each other */
	for (var orientId = 0; orientId < numOrientations; orientId++) {
		distribution.push(1);
		for (segmentId = 0; segmentId < segmentDirections.length; segmentId++) {
			if (segmentDirections[segmentId].multipleOf(SegmentDirections[tanType][orientId][pointId][0])) {
				distribution[orientId] += increaseProbability;
			}
			if (segmentDirections[segmentId].multipleOf(SegmentDirections[tanType][orientId][pointId][1])) {
				distribution[orientId] += increaseProbability;
			}
		}
	}
	return normalizeProbability(distribution);
};

/* Assumes that the sum of all values in distribution is 1 */
const sampleOrientation = function (distribution) {
	/* Generate value between 0 and 1 */
	const sample = Math.random();
	/* Successively compute accumulated distribution and return if sample is
	 * smaller than the accumulated value -> then falls into the interval for
	 * that index */
	distribution = distribution.slice(0);
	if (sample < distribution[0]) return 0;
	for (let index = 1; index < numOrientations; index++) {
		distribution[index] += distribution[index - 1];
		if (sample <= distribution[index]) {
			return index;
		}
	}
	return numOrientations - 1;
};

/* Add the points of the new tan to an array of points of the already placed
 * tans */
const updatePoints = function (currentPoints, newTan) {
	const newPoints = newTan.getPoints();
	currentPoints = currentPoints.concat(newPoints);
	return eliminateDuplicates(currentPoints, Point.comparePoints, true);
};

/* Add the segments of the new tan to an array of segments of the already placed
 * tans while also splitting the segments of points */
const updateSegments = function (currentSegments, newTan) {
	/* Only the points of the new Tan can split any of the already present segments */
	const newPoints = newTan.getPoints();
	let allSegments = [];
	/* Check for each segment if it should be split by any of the new points */
	for (let segmentId = 0; segmentId < currentSegments.length; segmentId++) {
		const splitPoints = [];
		for (let pointId = 0; pointId < newPoints.length; pointId++) {
			if (currentSegments[segmentId].onSegment(newPoints[pointId])) {
				splitPoints.push(newPoints[pointId]);
			}
		}
		allSegments = allSegments.concat(currentSegments[segmentId].split(splitPoints));
	}
	/* Add the segments of the new tan and than delete duplicates */
	allSegments = allSegments.concat(newTan.getSegments());
	allSegments = eliminateDuplicates(allSegments, LineSegment.compareLineSegments, true);
	return allSegments;
};

/* Function to randomly generate a tangram with more overlapping edges */
const generateTangramEdges = function () {
    /* Generate an order in which the tan pieces are to be placed and decide on
     * whether the parallelogram is flipped or not */
	const flipped = Math.floor(Math.random() * 2);
	let tanOrder = [0, 0, 1, 2, 2, 3, 4 + flipped];
	tanOrder = shuffleArray(tanOrder);
	let orientation = Math.floor((Math.random() * numOrientations));
	/* Place the first tan, as defined in tanOrder, at the center the drawing space
	 * with the just sampled orientation */
	const tans = [];
	let anchor = new Point(new IntAdjoinSqrt2(30, 0), new IntAdjoinSqrt2(30, 0));
	tans[0] = new Tan(tanOrder[0], anchor, orientation);
	let allPoints = tans[0].getPoints();
	let allSegments = tans[0].getSegments();
	for (let tanId = 1; tanId < 7; tanId++) {
		let tanPlaced = false;
		let counter = 0;
		while (!tanPlaced) {
            /* Choose point at which new tan is to be attached */
            anchor = allPoints[Math.floor(Math.random() * allPoints.length)].dup();
            /* Choose point of the new tan that will be attached to that point */
			let pointId = 0;
			let pointOrder = (tanOrder[tanId] < 3) ? [0, 1, 2] : [0, 1, 2, 3];
			pointOrder = shuffleArray(pointOrder);
            do {
				let newTan;
				/* Compute probability distribution for orientations */
				let orientationDistribution = computeOrientationProbability(tans, anchor,
					tanOrder[tanId], pointOrder[pointId], allSegments);
				/* Sample a new orientation */
                while (typeof orientationDistribution != 'undefined' && !tanPlaced) {
                    orientation = sampleOrientation(orientationDistribution);
                    if (pointOrder[pointId] === 0) {
                        newTan = new Tan(tanOrder[tanId], anchor, orientation);
                    } else {
						const tanAnchor = anchor.dup().subtract(Directions[tanOrder[tanId]]
							[orientation][pointOrder[pointId] - 1]);
						newTan = new Tan(tanOrder[tanId], tanAnchor, orientation);
                    }
                    if (checkNewTan(tans, newTan)) {
                        tans[tanId] = newTan;
                        tanPlaced = true;
                        allPoints = updatePoints(allPoints, newTan);
                        allSegments = updateSegments(allSegments, newTan);
                    }
                    /* Set probability of the just failed orientation to 0, so it
                     * is not chosen again */
                    orientationDistribution[orientation] = 0;
                    orientationDistribution = normalizeProbability(orientationDistribution);
                }
                pointId++;
            } while (!tanPlaced && pointId < ((tanOrder[tanId] < 3) ? 3 : 4));
            counter++;
            /* Try again - can this ever happen? */
            if (counter > 100) {
                console.log("Infinity loop!");
                return generateTangramEdges();
            }
        }
    }
    return new Tangram(tans);
};

/* Generate a given number of tangrams, after each generation send a message to
 * the main script, at the end of generation sort tangrams and send the tans of
 * the first six as JSON string */
export const generateTangrams = function (number) {
	let generated = [];
	for (let index = 0; index < number; index++) {
        generated[index] = generateTangramEdges();
        /* Clean up objects - delete keys that have just been set to avoid
         * computing these properties multiple times */
        for (let tanId = 0; tanId < 7; tanId++) {
            delete generated[index].tans[tanId].points;
            delete generated[index].tans[tanId].segments;
            delete generated[index].tans[tanId].insidePoints;
        }
    }
	// TODO: this (default) sorts tangrams by most difficult to solve (prob 1. or 2. tangram displayed)
	// use this for difficulty setting in the later stages of development
    if (!evalVal){
    	console.log("sorting tangrams...");
        generated = generated.sort(compareTangrams);
    }
    const jsonTans = [];
    for (let index = 0; index < number; index++) {
        jsonTans.push(JSON.stringify(generated[index].tans));
    }
    return jsonTans;
};
