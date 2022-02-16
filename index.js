const {promisify} = require('util');
const {Storage}   = require('@google-cloud/storage');
const exec        = promisify(require('child_process').exec);
const storage     = new Storage();

const express    = require('express');
const app        = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log('Listening on port', port);
});

app.post('/', async (req, res) => {
  try {
    // For PubSub trigger
    if (req.body.message) {
	    const file = decodeBase64Json(req.body.message.data);
	    await downloadFile(file.bucket, file.name);
	    const pdfFileName = await convertFile(file.name);
	    await uploadFile(process.env.PDF_BUCKET, pdfFileName);
    } 
    // For REST based trigger
    else {
    	   file = req.body.filename;
           bucket = req.body.bucket;
           await downloadFile(bucket, file);
           const pdfFileName = await convertFile(file);
           await uploadFile(process.env.PDF_BUCKET, pdfFileName);
    }
  }
  catch (ex) {
    console.log(`Error: ${ex}`);
  }
  res.set('Content-Type', 'text/plain');
  res.send('\n\nOK\n\n');
})

function decodeBase64Json(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}

async function downloadFile(bucketName, fileName) {
  const options = {destination: `/tmp/${fileName}`};
  await storage.bucket(bucketName).file(fileName).download(options);
}
async function convertFile(fileName) {
  const cmd = 'libreoffice --headless --convert-to tiff --outdir /tmp ' +
              `"/tmp/${fileName}"`;
  console.log(cmd);
  const { stdout, stderr } = await exec(cmd);
  if (stderr) {
    throw stderr;
  }
  console.log(stdout);
  pdfFileName = fileName.replace(/\.\w+$/, /*'.pdf'*/ '.tiff');
  return pdfFileName;
}
async function deleteFile(bucketName, fileName) {
  await storage.bucket(bucketName).file(fileName).delete();
}
async function uploadFile(bucketName, fileName) {
  await storage.bucket(bucketName).upload(`/tmp/${fileName}`);
}
