// Add this DUPLICATE function to increase duplication
function badDuplicateFunction() {
    console.log("This is duplicate code");
    console.log("This is duplicate code");
    console.log("This is duplicate code");
}

// Add another duplicate
function anotherDuplicate() {
    console.log("This is duplicate code");
    console.log("This is duplicate code");
    console.log("This is duplicate code");
}// Add a complex function
function veryComplexFunction(x, y, z) {
    if (x > 0) {
        if (y > 0) {
            if (z > 0) {
                return x + y + z;
            } else {
                if (x > y) {
                    return x - y;
                } else {
                    if (y > z) {
                        return y - z;
                    } else {
                        if (z > x) {
                            return z - x;
                        }
                    }
                }
            }
        }
    }
    return 0;
}
