/**
 * Class for numbers in the ring of integers adjoined square root of 2
 */

/* Constructor */
import {generating, numberEq, numberRange} from "./helpers";

export class IntAdjoinSqrt2 {
	constructor(coeffInt, coeffSqrt) {
		this.coeffInt = coeffInt;
		this.coeffSqrt = coeffSqrt;
	}

	/* Duplication */
	dup = function () {
		return new IntAdjoinSqrt2(this.coeffInt, this.coeffSqrt);
	};

	/* Conversion */
	toFloat = function () {
		return this.coeffInt + this.coeffSqrt * Math.SQRT2;
	};

	/* Checking if this number is equal to another one, in generating only whole
	 * numbers are used === can be used for comparison */
	eq = function (other) {
		if (generating.val) {
			return this.coeffInt === other.coeffInt && this.coeffSqrt === other.coeffSqrt;
		} else {
			return numberEq(this.coeffInt, other.coeffInt) && numberEq(this.coeffSqrt, other.coeffSqrt);
		}
	};

	/* Check if two numbers have the same sign */
	sameSign = function (other) {
		const zero = new IntAdjoinSqrt2(0, 0);
		return zero.compare(this) === zero.compare(other);
	};

	/* Compare this number to another one, returns 0 is the numbers are equal, -1 is
	 * this number is smaller than the other one and 1, if this one is bigger than the
	 * other one */
	compare = function (other) {
		if (this.eq(other)) {
			return 0;
		} else {
			const floatThis = this.toFloat();
			const floatOther = other.toFloat();
			if (floatThis < floatOther) {
				return -1;
			} else {
				return 1;
			}
		}
	};

	/* Compare function to be passed to sorting functions */
	static compareIntAdjoinSqrt2s = function (numberA, numberB) {
		return numberA.compare(numberB);
	};

	/* Compute the absolute distance between this and another number */
	distance = function (other) {
		const result = this.dup();
		result.subtract(other);
		return result.abs();
	};

	/* Check if two numbers lie withing a given range of oneanother */
	closeNumbers = function (other, range) {
		return numberRange(this.toFloat(), other.toFloat(), range);
	};

	/* Check if this number is equal to zero, use === during generating */
	isZero = function () {
		if (generating.val) {
			return this.coeffInt === 0 && this.coeffSqrt === 0;
		} else {
			return (numberEq(this.coeffInt, 0) && numberEq(this.coeffSqrt, 0));
		}
	};

	/* Basic arithmetic - Adding another number to this one */
	add = function (other) {
		this.coeffInt += other.coeffInt;
		this.coeffSqrt += other.coeffSqrt;
		return this;
	};

	/* Basic arithmetic - Subtracting another number from this one */
	subtract = function (other) {
		this.coeffInt -= other.coeffInt;
		this.coeffSqrt -= other.coeffSqrt;
		return this;
	};

	/* Basic arithmetic - Multiplying this number by another one */
	multiply = function (other) {
		/* (a + bx)*(c + dx) = (ac + bdxx) + (ad + bc)*x where x = sqrt(2) */
		const coeffIntCopy = this.coeffInt;
		this.coeffInt = coeffIntCopy * other.coeffInt + 2 * this.coeffSqrt * other.coeffSqrt;
		this.coeffSqrt = coeffIntCopy * other.coeffSqrt + this.coeffSqrt * other.coeffInt;
		return this;
	};

	/* Basic arithmetic - Dividing this number another one --> will possibly result
	 * in floating point coefficients */
	div = function (other) {
		const denominator = other.coeffInt * other.coeffInt - 2 * other.coeffSqrt * other.coeffSqrt;
		if (numberEq(denominator, 0)) {
			//console.log("Division by 0 is not possible!");
			return;
		}
		/* (a + bx)/(c + dx) = ((a + bx)*(c - dx))/((c + dx)*(c - dx)) with x = sqrt(2)
		 * = (ac- 2bd)/(cc - ddxx) + (bc- ad)*x/(cc - ddxx) */
		const coeffIntCopy = this.coeffInt;
		this.coeffInt = coeffIntCopy * other.coeffInt - 2 * this.coeffSqrt * other.coeffSqrt;
		this.coeffSqrt = this.coeffSqrt * other.coeffInt - coeffIntCopy * other.coeffSqrt;
		return this;
	};

	/* Basic arithmetic - Negation */
	neg = function () {
		this.coeffInt = -this.coeffInt;
		this.coeffSqrt = -this.coeffSqrt;
		return this;
	};

	/* Basic arithmetic - Absolute Value */
	abs = function () {
		if (this.toFloat() < 0) {
			this.coeffInt = -this.coeffInt;
			this.coeffSqrt = -this.coeffSqrt;
		}
		return this;
	};

	/* Basic arithmetic - Scaling of the coefficients */
	scale = function (factor) {
		if (numberEq(factor, 0)) {
			console.log("Scaling by 0 is not possible!");
			/* Somehow this fixes strange Safari error ?? */
			console.log(JSON.stringify(this));
			return;
		}
		this.coeffInt *= factor;
		this.coeffSqrt *= factor;
		return this;
	};

	/* Min and max operations for this special number type */
	static IntAdjoinSqrt2Min = function (a, b) {
		const compare = a.compare(b);
		if (compare <= 0) {
			return a;
		} else {
			return b;
		}
	};

	static IntAdjoinSqrt2Max = function (a, b) {
		const compare = a.compare(b);
		if (compare >= 0) {
			return a;
		} else {
			return b;
		}
	}
}
