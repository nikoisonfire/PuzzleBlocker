/**
 * Class for a projective three-dimensional point or vector
 */

/* Constructor */
import {IntAdjoinSqrt2} from "./intadjoinsqrt2";
import {clipAngle, numberEq, numberNEq, toDegrees, toRadians} from "./helpers";

export class Point {
	constructor(x, y) {
		if (typeof x === 'undefined') {
			this.x = new IntAdjoinSqrt2(0, 0);
		} else {
			this.x = x;
		}
		if (typeof y === 'undefined') {
			this.y = new IntAdjoinSqrt2(0, 0);
		} else {
			this.y = y;
		}
	}

	/* Duplication */
	dup = function () {
		return new Point(this.x.dup(), this.y.dup());
	};

	/* Conversion and to floating point numbers of x- and y-coordinates */
	toFloatX = function () {
		return this.x.toFloat();
	};

	toFloatY = function () {
		return this.y.toFloat();
	};


	/* Comparison of Points by first x- and then y-coordinate, returns -1 if
	 * this point is "smaller" than the other one and 1, if this one is "bigger" than
	 * the other one*/
	compare = function (other) {
		const xCompare = this.x.compare(other.x);
		const yCompare = this.y.compare(other.y);
		if (xCompare != 0) {
			return xCompare;
		} else {
			return yCompare;
		}
	};

	/* Comparison of Points by first y- and then x-coordinate, returns -1 if
	 * this point is "smaller" than the other one and 1, if this one is "bigger" than
	 * the other one*/
	compareYX = function (other) {
		const xCompare = this.x.compare(other.x);
		const yCompare = this.y.compare(other.y);
		if (yCompare != 0) {
			return yCompare;
		} else {
			return xCompare;
		}
	};

	/* Returns true if the given direction vector is the same or a multiple this one */
	multipleOf = function (other) {
		/* Direction vectors are a multiple of each other if they either are both
		 * equal to (0,0), if they both have the form (0,a) or (a,0) where the a has
		 * has the same sign in both cases or (a,b) = s*(c,d) */
		const sameSignX = this.x.sameSign(other.x);
		const sameSignY = this.y.sameSign(other.y);
		if (!(sameSignX && sameSignY)) return false;
		if (this.x.isZero() && other.x.isZero()) {
			if (this.y.isZero() && other.y.isZero()) {
				return true;
			} else {
				return sameSignY;
			}
		} else if (this.y.isZero() && other.y.isZero()) {
			return sameSignX;
		} else {
			const xFactor = this.x.dup().div(other.x);
			const yFactor = this.y.dup().div(other.y);
			if (typeof xFactor === 'undefined' || typeof yFactor === 'undefined') {
				console.log("Undefined");
				console.log(this.x.coeffInt + "," + this.x.coeffSqrt + " - " + this.y.coeffInt + "," + this.y.coeffSqrt);
				console.log(other.x.coeffInt + "," + other.x.coeffSqrt + " - " + other.y.coeffInt + "," + other.y.coeffSqrt);
				return false;
			} else {
				/*var res = xFactor.eq(yFactor);
				if (res) {
					console.log("True");
					console.log(this.x.coeffInt + "," + this.x.coeffSqrt + " - "  + this.y.coeffInt + "," + this.y.coeffSqrt);
					console.log(other.x.coeffInt + "," + other.x.coeffSqrt + " - "  + other.y.coeffInt + "," + other.y.coeffSqrt);
				}*/
				return xFactor.eq(yFactor);
			}
		}
	};

	/* Function for comparing points used in sorting */
	static comparePoints = function (pointA, pointB) {
		return pointA.compare(pointB);
	};

	static comparePointsYX = function (pointA, pointB) {
		return pointA.compareYX(pointB);
	};

	/* Points are equal if both coordinates are equal */
	eq = function (other) {
		return this.x.eq(other.x) && this.y.eq(other.y);
	};

	/* check if both coordinates lie within a given range of each other */
	static closePoint = function (pointA, pointB, range) {
		return pointA.x.closeNumbers(pointB.x, range) && pointA.y.closeNumbers(pointB.y, range);
	};

	/* Check if this point is equal to (0,0) */
	isZero = function () {
		return this.x.isZero() && this.y.isZero();
	};

	/* Returns the length of the vector from (0,0) to this point as a number */
	length = function () {
		return Math.sqrt(this.dotProduct(this).toFloat());
	};

	neg = function () {
		this.x.neg();
		this.y.neg();
		return this;
	};

	/* Compute angle of this point interpreted as a direction vector */
	angle = function () {
		if (this.isZero()) {
			return 0;
		}
		let angle = Math.atan2(this.toFloatY(), this.toFloatX());
		angle = clipAngle(toDegrees(angle));
		/* (Angles should be multiples of 45 degrees, so this shouldn't cause problems */
		return Math.round(angle);
	};

	distance = function (other) {
		const toOther = other.dup().subtract(this);
		return toOther.length();
	};

	angleTo = function (other) {
		/* The angle is calculated with atan2, which is not defined for (0,0).
		 * Therefore, handle cases where one point is (0,0) first */
		if (this.isZero()) {
			return other.angle();
		}
		if (other.isZero()) {
			return this.angle();
		}
		let angle = 360 - (other.angle() - this.angle());
		angle = clipAngle(angle);
		return angle;
	};

	/* Combinations of Points */
	add = function (other) {
		this.x.add(other.x);
		this.y.add(other.y);
		return this;
	};

	middle = function (other) {
		const result = new Point();
		result.add(this);
		result.add(other);
		result.scale(0.5);
		return result;
	};

	subtract = function (other) {
		this.x.subtract(other.x);
		this.y.subtract(other.y);
		return this;
	};

	normalize = function () {
		const length = this.length();
		if (numberNEq(length, 0)) {
			this.x.scale(1 / length);
			this.y.scale(1 / length);
		}
		return this;
	};

	dotProduct = function (other) {
		/* Multiplication of respective coordinates then summation of those products */
		return this.x.dup().multiply(other.x).add(this.y.dup().multiply(other.y));
	};

	determinant = function (other) {
		/* In 2D, the cross product corresponds to the determinant of the matrix with the
		 * two points as rows or columns */
		return this.x.dup().multiply(other.y).subtract(this.y.dup().multiply(other.x));
	};

	/* Transform a point by a given 3x3-matrix, this includes a transformation into
	 * projective space and back  */
	transform = function (transMatrix) {
		if (transMatrix.length != 3) {
			console.log("Matrix seems to have the wrong dimension!");
			return;
		}
		let z = new IntAdjoinSqrt2(1, 0);
		const copy = this.dup();
		this.x = copy.x.dup().multiply(transMatrix[0][0]);
		this.x.add(copy.y.dup().multiply(transMatrix[0][1]));
		this.x.add(z.dup().multiply(transMatrix[0][2]));
		this.y = copy.x.dup().multiply(transMatrix[1][0]);
		this.y.add(copy.y.dup().multiply(transMatrix[1][1]));
		this.y.add(z.dup().multiply(transMatrix[1][2]));
		const zCopy = z.dup();
		z = copy.x.dup().multiply(transMatrix[2][0]);
		z.add(copy.y.dup().multiply(transMatrix[2][1]));
		z.add(zCopy.dup().multiply(transMatrix[2][2]));
		if (numberNEq(z, 1) && numberNEq(z, 0)) {
			this.x.div(z);
			this.y.div(z);
		}
		return this;
	};

	translate = function (transX, transY) {
		const translationMatrix =
			[[new IntAdjoinSqrt2(1, 0), new IntAdjoinSqrt2(0, 0), transX],
				[new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(1, 0), transY],
				[new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(1, 0)]];
		return this.transform(translationMatrix);
	};

	rotate = function (angle) {
		/* Transform angle to that it falls in the interval [0;360] */
		angle = clipAngle(angle);
		let cos;
		let sin;
		/* Handle cases where the angle is a multiple of 45 degrees first */
		/* If angle is not a multiple of 45 degrees */
		if (angle % 45 != 0) {
			cos = new IntAdjoinSqrt2(Math.cos(toRadians(angle)), 0);
			sin = new IntAdjoinSqrt2(Math.sin(toRadians(angle)), 0);
		} else {
			/* Determine value of sin and cos */
			if (angle % 90 != 0) {
				cos = new IntAdjoinSqrt2(0, 0.5);
				sin = new IntAdjoinSqrt2(0, 0.5);
			} else if (angle % 180 != 0) {
				cos = new IntAdjoinSqrt2(0, 0);
				sin = new IntAdjoinSqrt2(1, 0);
			} else {
				cos = new IntAdjoinSqrt2(1, 0);
				sin = new IntAdjoinSqrt2(0, 0);
			}
			/* Determine the sign of sin and cos */
			if (angle > 180 && angle < 360) {
				sin.neg();
			}
			if (angle > 90 && angle < 270) {
				cos.neg();
			}
		}
		const rotationMatrix = [[cos, sin.dup().neg(), new IntAdjoinSqrt2(0, 0)],
			[sin, cos, new IntAdjoinSqrt2(0, 0)],
			[new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(0, 0), new IntAdjoinSqrt2(1, 0)]];
		this.transform(rotationMatrix);
		return this;
	};

	scale = function (factor) {
		if (numberEq(0, factor)) {
			console.log("Attempt to scale by 0!");
			/* Somehow this fixes strange Safari error ?? */
			console.log(JSON.stringify(this));
			return;
		}
		this.x.scale(factor);
		this.y.scale(factor);
		return this;
	}
}
/* Returns the relative orientation of three points, if the points are collinear,
 * the method returns 0, otherwise it return -1 or +1 depending on which side */
export const relativeOrientation = function (pointA, pointB, pointC) {
    const determinant = pointA.dup().subtract(pointC).determinant(pointB.dup().subtract(pointC));
    if (determinant.isZero()) {
        return 0;
    } else {
        return determinant.toFloat() > 0 ? 1 : -1;
    }
};

/* Checks if an array contains two points more than once */
export const bothPointsMultipleTimes = function (pointArray, pointA, pointB) {
	const occurrenceA = [];
	const occurrenceB = [];
	for (let pointId = 0; pointId < pointArray.length; pointId++) {
        if (pointArray[pointId].eq(pointA)) {
            occurrenceA.push(pointId);
        }
        if (pointArray[pointId].eq(pointB)) {
            occurrenceB.push(pointId);
        }
    }
    return occurrenceA.length >= 2 && occurrenceB.length >= 2;
};
