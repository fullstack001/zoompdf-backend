const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtSecret = require("../../config/jwtSecret");
const os = require("os");
const osUtils = require("os-utils");
const { exec } = require("child_process");

const checkDiskSpace = require("check-disk-space").default;

const auth = require("../../middleware/auth");
const Clients = require("../../models/Clients");
const Blog = require("../../models/Blog");
const fs = require("fs");

// Function to execute a shell command and return a promise
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(stderr);
        return;
      }
      resolve(stdout);
    });
  });
}

// Function to parse network statistics output and calculate speeds
function parseNetworkStats(output) {
  const lines = output.split("\n");
  let uploadSpeed = 0;
  let downloadSpeed = 0;
  lines.forEach((line) => {
    if (line.includes("RX bytes")) {
      const match = line.match(/RX bytes:(\d+) .* TX bytes:(\d+)/);
      if (match) {
        const bytesReceived = parseInt(match[1]);
        const bytesSent = parseInt(match[2]);
        // Assuming output is in bytes, convert to Mbps for speed calculation
        downloadSpeed = bytesReceived / 1024 / 1024; // Convert bytes to megabytes
        uploadSpeed = bytesSent / 1024 / 1024; // Convert bytes to megabytes
      }
    }
  });
  return { uploadSpeed, downloadSpeed };
}

// Function to get upload and download speeds
async function getNetworkSpeeds() {
  try {
    let command = "";
    if (process.platform === "linux") {
      command = "ifconfig";
    } else if (process.platform === "win32") {
      command = "ipconfig";
      isWindows = true;
    } else {
      throw new Error("Unsupported platform");
    }

    const output = await executeCommand(command);
    const { uploadSpeed, downloadSpeed } = parseNetworkStats(output);

    return `${uploadSpeed.toFixed(2)} Mbps / ${downloadSpeed.toFixed(2)} Mbps`;
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// @route    POST api/admin/client
// @desc     save client info
// @access   Public
router.post("/client", async (req, res) => {
  //Retrieve the info from post request
  const { ip, browser, downUrl, workUrl, file } = req.body;

  try {
    let clients = await Clients.findOne({ file });

    if (clients) {
      return res
        .status(400)
        .json({ errors: [{ msg: "client already exists" }] });
    }
    clients = new Clients({
      ip,
      browser,
      downUrl,
      workUrl,
      file,
    });

    await clients.save();

    res.json({ msg: "success" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid Email Address" }] });
    }

    if (!user.isAdmin) {
      return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: "Invalid Password" }] });
    }

    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin,
      },
    };
    jwt.sign(payload, jwtSecret, { expiresIn: "1 days" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get("/liveviews", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  await Clients.find(
    {},
    "ip browser workUrl timestamp",
    function (err, clients) {
      if (err) {
        res.status(400).json({ error: [{ msg: "Server Error" }] });
        // Handle error
      } else {
        // Handle clients data
        res.json({ data: clients });
      }
    }
  );
});

router.get("/files", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  await Clients.find()
    .sort({ timestamp: -1 }) // Sort by createdAt in descending order
    .exec((err, clients) => {
      if (err) {
        res.status(400).json({ error: [{ msg: "Server Error" }] });
        // Handle error
      } else {
        // Handle clients data
        res.json({ data: clients });
      }
    });
});

router.get("/blogs", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  await Blog.find()
    .sort({ uploadTime: -1 }) // Sort by createdAt in descending order

    .exec({}, function (err, blogs) {
      if (err) {
        res.status(400).json({ error: [{ msg: "Server Error" }] });
        // Handle error
      } else {
        // Handle clients data
        res.json(blogs);
      }
    });
});

router.delete("/blog/:id", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
  if (deletedBlog) {
    res.json({ msg: "delete success" });
  } else {
    res.status(400).json({ mgs: "server err" });
  }
});

router.put("/blog/:id", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  // Extract the ID from the request parameters
  const itemId = req.params.id;
  const upData = JSON.parse(req.body.data);
  const { img, metaData } = upData;

  const lastIndex = metaData.image.lastIndexOf("/");

  // Extract the filename using substring
  const filename = metaData.image.substring(lastIndex + 1);
  const filePath = `./blog/${filename}`; // Assuming the blog folder exists in the project's root directory

  // Parse base64 image data
  const imgData = img.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(imgData, "base64");

  // Write the image data to a file
  fs.writeFile(filePath, buf, async (err) => {
  if (err) {
    console.error(err);
    return res
      .status(500)
      .json({ errors: [{ msg: "Failed to save image" }] });
  }

  try {
    // Find the item by ID and update it with the new data
    const updatedItem = await Blog.findByIdAndUpdate(itemId, upData, {
      new: true,
    });

    // Check if the item was found and updated
    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Send a success response with the updated item
    res.status(200).json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});
 
});

router.post("/blog", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }
  const blogData = JSON.parse(req.body.data);
  const { url, title, img, content, available, metaData } = blogData;

  const lastIndex = metaData.image.lastIndexOf("/");

  // Extract the filename using substring
  const filename = metaData.image.substring(lastIndex + 1);
  const filePath = `./blog/${filename}`; // Assuming the blog folder exists in the project's root directory

  // Parse base64 image data
  const imgData = img.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(imgData, "base64");

  // Write the image data to a file
  fs.writeFile(filePath, buf, (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ errors: [{ msg: "Failed to save image" }] });
    }

    // Image saved successfully, continue saving blog data to the database
    const blog = new Blog({
      url,
      title,
      img: filename, // Save the filename in the database instead of base64 data
      content,
      available,
      metaData,
    });

    blog
      .save()
      .then(() => {
        // Retrieve all blogs and send the response
        Blog.find().then((blogs) => {
          res.json(blogs);
        });
      })
      .catch((err) => {
        console.error(err);
        return res
          .status(500)
          .json({ errors: [{ msg: "Failed to save blog data" }] });
      });
  });
});

router.get("/serverstatus", auth, async (req, res) => {
  user = req.user;
  if (!user.isAdmin) {
    return res.status(400).json({ errors: [{ msg: "Invalid Admin" }] });
  }

  const cpus = os.cpus();
  const totalCores = cpus.length;
  let totalHz = 0;
  await cpus.forEach((core) => {
    totalHz += core.speed;
  });
  console.log("Total CPU Hz:", totalHz);

  // Get CPU usage Hz
  let cpuUsageHz = 0;
  await osUtils.cpuUsage((cpuUsage) => {
    cpuUsageHz = totalHz * cpuUsage;
    console.log("CPU Usage Hz:", cpuUsageHz);
  });
  const totalMemory = await os.totalmem();
  const freeMemory = await os.freemem();

  console.log(`Total Memory: ${totalMemory}`);
  console.log(`Free Memory: ${freeMemory}`);

  let diskUsage = null;

  if (process.platform === "linux") {
    await checkDiskSpace("/").then((diskSpace) => {
      diskUsage = diskSpace;
      console.log(diskSpace);
    });
  } else if (process.platform === "win32") {
    await checkDiskSpace("C:/").then((diskSpace) => {
      diskUsage = diskSpace;
      console.log(diskSpace);
    });
  } else {
    throw new Error("Unsupported platform");
  }

  const bandWidth = await getNetworkSpeeds();
  console.log(bandWidth);

  const cpuStatus = await `${(cpuUsageHz / 1000).toFixed(2)} GHz / ${(
    totalHz / 1000
  ).toFixed(2)} GHz`;
  const memoryStatus = await `${(
    (totalMemory - freeMemory) /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB / ${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  const diskStatus = await `${(
    (diskUsage.size - diskUsage.free) /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB / ${(diskUsage.size / (1024 * 1024 * 1024)).toFixed(2)} GB`;

  const serverStatus = {
    cpu: cpuStatus,
    memory: memoryStatus,
    disk: diskStatus,
    bandWidth: bandWidth,
  };
  res.json(serverStatus);
});

module.exports = router;
