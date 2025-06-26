const Pdf = require("../models/Pdf");
const Clients = require("../models/Clients");
const fs = require("fs");

// Scheduled task to delete files older than two hours
async function deleteOldFiles() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // Two hours ago

  console.log(twoHoursAgo);
  try {
    // Find files older than two hours
    const filesToDelete = await Pdf.find({ uploadTime: { $lt: twoHoursAgo } });

    filesToDelete.forEach(async (file) => {
      try {
        await Clients.findOne({ file: file.name }).then((client) => {
          client.deleted = true;
          client.save();
        });
        // Delete file from storage (assuming files are stored in a directory)
        fs.unlinkSync(`./uploads/${file.name}`);

        console.log(`File ${file.name} deleted.`);
      } catch (error) {
        console.error(`Error deleting file ${file.name}:`, error);
      }
      // Delete file from the database
      await Pdf.findByIdAndDelete(file._id);
    });
  } catch (error) {
    console.error("Error finding files:", error);
  }
}

module.exports = deleteOldFiles;
