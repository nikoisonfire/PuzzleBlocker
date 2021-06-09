/* generating variable -> True if still in generating process */
export let generating = {
	val: true
};
export let evalVal = false;

/* Conversion between different angle systems */
export const toRadians = function (degrees) {
    return degrees * Math.PI / 180.0;
};

export const toDegrees = function (radians) {
    return radians * 180.0 / Math.PI;
};

/* Transform angle to that it falls in the interval [0;360] */
export const clipAngle = function (angle) {
    if (angle < 0) {
        while (angle < 0) {
            angle += 360;
        }
    } else if (angle >= 360) {
        while (angle >= 360) {
            angle -= 360;
        }
    }
    return angle;
};

/* Comparison of to Numbers taking into account precision */

/* Returns true, if the absolute error between two given doubles is smaller than a
 * set threshold */
export const numberEq = function (a, b) {
    return Math.abs(a - b) < 0.000000000001;
};

/* Returns true, if the absolute error between two given doubles is smaller than a
 * given range */
export const numberRange = function (a, b, range) {
    return Math.abs(a - b) < range;
};

/* Returns true, if the two given numbers are not within a a set threshold of
 * each other */
export const numberNEq = function (a, b) {
    return !numberEq(a, b);
};

/* Cross product in 3D */
export const crossProduct3D = function (a, b) {
    if (a.length != 3 || b.length != 3) {
        return [0, 0, 0];
    }
    let result = [];
    result[0] = a[1] * b[2] - a[2] * b[1];
    result[1] = a[2] * b[0] - a[0] * b[2];
    result[2] = a[0] * b[1] - a[1] * b[0];
    return result;
};

/* Shuffle an array, algorithm based on Fisher-Yates-Shuffle */
export const shuffleArray = function (array) {
    let elementsLeft = array.length;
    let elementCopy, index;
    /* while there are still element left */
    while (elementsLeft) {
        /* Pick one of the remaining elements (index between 0 and elementsLeft -1 */
        index = Math.floor(Math.random() * elementsLeft);
        elementsLeft--;
        /* Switch the chosen element with the one at index elementsLeft, this
         * results in filling the array with randomly chosen elements from the back */
        elementCopy = array[elementsLeft];
        array[elementsLeft] = array[index];
        array[index] = elementCopy;
    }
    return array;
};

/* Eliminate duplicates in an array, based on a given compare function */
export const eliminateDuplicates = function (array, compareFunction, keepDoubles) {
    array = array.sort(compareFunction);
    const newArray = [array[0]];
    for (let index = 1; index < array.length; index++) {
        newArray.push(array[index]);
        if (compareFunction(array[index], array[index - 1]) === 0) {
            newArray.pop();
            /* Throw the other part of the duplicate away as well */
            if (!keepDoubles) {
                newArray.pop();
            }
        }
    }
    return newArray;
};

/* Check if two array have equal content, based on a given compare function */
export const arrayEq = function (arrayA, arrayB, compareFunction) {
    if (arrayA.length != arrayB.length) {
        return false;
    }
    arrayA = arrayA.slice(0).sort(compareFunction);
    arrayB = arrayB.slice(0).sort(compareFunction);
    for (let index = 0; index < arrayA.length; index++) {
        if (compareFunction(arrayA[index], arrayB[index]) != 0) {
            return false;
        }
    }
    return true;
};

/* Count the number of unique elements in an array, based on a given compare
 * function */
export const numUniqueElements = function (array, compareFunction) {
    const unique = eliminateDuplicates(array.slice(0), compareFunction, true);
    return unique.length;
};



