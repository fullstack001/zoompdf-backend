const fs = require("fs");

const fileSize = (path) => {
    return new Promise((resolve, reject) => {
        console.log(path);
        // Use fs.stat to get file information, including size
        fs.stat(path, (err, stats) => {
            if (err) {
                reject(`Error reading file: ${err.message}`);
            } else {
                const fileSizeInBytes = stats.size;
                const fileSizeInKilobytes = fileSizeInBytes / 1024;
                const fileSizeInMegabytes = fileSizeInKilobytes / 1024;
                console.log(fileSizeInBytes);
                resolve(fileSizeInKilobytes);
            }
        });
    });
};

module.exports = fileSize;
