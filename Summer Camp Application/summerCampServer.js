const express = require("express");
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require("path");
const readline = require('readline');
require("dotenv").config();

const app = express();
const port = process.argv[2] || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'templates'));


const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = { db: "CMSC335_DB", collection: "campApplicants" };

// HTML templates
const mainPage = "main";
const applicationPage = "application";
const reviewPage = "review";
const selectByGPAPage = "selectByGPA";
const removeAllPage = "removeAll";
const informationPage = (applicantData) => {
    const formattedDate = new Date().toString();
    // return style of HOME link to default like in other pages
    return {
        template: "information",
        data: {
            applicantData: applicantData,
            formattedDate: formattedDate
        }
    };
};

app.get("/", (req, res) => {
  res.render(mainPage);
});

app.get("/application", (req, res) => {
  res.render(applicationPage);
});

app.get("/review", (req, res) => {
  res.render(reviewPage);
});

app.get("/selectByGPA", (req, res) => {
  res.render(selectByGPAPage);
});

app.get("/selectByGPAResult", (req, res) => {
  res.render("selectByGPAResult");
});

app.get("/removeAll", (req, res) => {
  res.render(removeAllPage);
});

app.post("/submit", async (req, res) => {
    const applicantData = req.body;

    try {
        const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
        await client.connect();

        const db = client.db(databaseAndCollection.db);
        const collection = db.collection(databaseAndCollection.collection);

        const result = await collection.insertOne(applicantData);

        const pageData = informationPage(applicantData);
        res.render(pageData.template, pageData.data);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


app.post("/review", async (req, res) => {
  const email = req.body.email; // Assuming the form field is named 'email'

  try {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();

    const db = client.db(databaseAndCollection.db);
    const collection = db.collection(databaseAndCollection.collection);

    const filter = { email: email };
    const result = await collection.findOne(filter);

    if (result) {
      const pageData = {
        template: "information",
        data: {
          applicantData: result,
          formattedDate: new Date().toString()
        }
      };
      res.render(pageData.template, pageData.data);
    } else {
      // Redirect to the information page with "NONE" for each entry
      const noneData = {
        name: "NONE",
        email: "NONE",
        gpa: "NONE",
        background: "NONE"
      };

      const pageData = {
        template: "information",
        data: {
          applicantData: noneData,
          formattedDate: new Date().toString()
        }
      };
      
      res.render(pageData.template, pageData.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/selectByGPA", async (req, res) => {
  const requestedGPA = parseFloat(req.body.gpa); // Convert to a floating-point number

  try {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();

    const db = client.db(databaseAndCollection.db);
    const collection = db.collection(databaseAndCollection.collection);

    // Convert stored GPA to a floating-point number for comparison
    const filter = {
      gpa: { $gte: parseFloat(requestedGPA).toString() }
    };

    // Sort by GPA in ascending order
    const sortOptions = { gpa: 1 };

    const cursor = collection.find(filter).sort(sortOptions);
    const applicants = await cursor.toArray();

    // Redirect to the selectByGPAResult page
    res.render("selectByGPAResult", { gpa: requestedGPA, applicants });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/removeAll", async (req, res) => {
  try {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();

    const db = client.db(databaseAndCollection.db);
    const collection = db.collection(databaseAndCollection.collection);

    const result = await collection.deleteMany({});

    // Render the removeAllResult.ejs template with the result data
    res.render("removeAllResult", { deletedCount: result.deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


const server = app.listen(port, () => {
  console.log(`Web server started and running at http://localhost:${port}`);
  process.stdout.write("Stop to shutdown the server: ");
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (input) => {
  const command = input.trim();
  if (command === 'stop') {
    console.log("Shutting down the server");
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.stdout.write("Stop to shutdown the server: " + command);
  }
});
