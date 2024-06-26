const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');


// ----- VARIABLES -----

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3030;

/**
 * Multer disk storage configuration.
 * @type {import('multer').StorageEngine}
 */
const storageVideo = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const inputName = req.headers.input
    cb(null, inputName);
  }
});
const uploadVideo = multer({ storage: storageVideo });


// ----- ENDPOINTS -----

/**
 * Serves the static files in the uploads and results directories.
 * 
 * @param {string} 'uploads' - The directory where the uploaded videos are stored.
 * @param {string} 'results' - The directory where the converted videos are stored.
 */
app.use(express.static('uploads'));
app.use(express.static('results'));


/**
 * Handles the POST request for the /command endpoint.
 * Executes FFmpeg command to convert the video with the specified command and returns the video converted along with its quality metrics.
 * 
 * @param {import('express').Request} req - The request object.
 * @param {file} video - The video to be converted.
 * @param {string} codec - The codec to convert the video.
 * 
 * @param {import('express').Response} res - The response object.
 * @param {string} response.messagge - The message returned.
 * @param {string} response.sourceVideoPath - The path of the source video.
 * @param {string} response.outputName - The name of the output file.
 * @param {string} response.codec - The codec used to convert the video.
 * 
 */
app.post('/codecs', uploadVideo.single('video'), (req, res) => {
  const codec = req.headers.codec;
  const outputName = `${req.file.originalname.split('.')[0]}_${codec}.${req.file.originalname.split('.')[1]}`;
  console.log(`---- CODEC: ${codec}`)

  const ffmpegCommand = `ffmpeg -i ${req.file.path} -c:v ${codec} results/${outputName}`;
  console.log(`-- FFMPEG: ${ffmpegCommand}`)
  exec(ffmpegCommand, (fferror, ffstdout, ffstderr) => {
    if (fferror) {
      console.error('Error:', fferror);
      res.status(500).send('Error:', fferror);
    }
    const response = {
      messagge: 'File converted!',
      sourceVideoPath: req.file.path,
      outputName: outputName,
      codec: codec
    };
    res.status(200).send(response);
  });
});


/**
 * Handles the POST request for the /command endpoint.
 * Executes FFmpeg command to convert the video with the specified command and returns the video converted along with its quality metrics.
 * 
 * @param {import('express').Request} req - The request object.
 * @param {file} video - The video to be converted.
 * @param {string} command - The command to be executed.
 * @param {string} outputName - The name of the output file.
 * 
 * @param {import('express').Response} res - The response object.
 * @param {string} response.messagge - The message returned.
 * @param {string} response.sourceVideoPath - The path of the source video.
 * @param {string} response.outputName - The name of the output file.
 * @param {string} response.codec - The command used to convert the video.
 * 
 */
app.post('/commands', uploadVideo.single('video'), (req, res) => {
  const command = req.headers.command;
  const outputName = req.headers.output;
  console.log(`---- COMMAND: ${command}`)

  const ffmpegCommand = `ffmpeg -i ${req.file.path} ${command} results/${outputName}`;
  console.log(`-- FFMPEG: ${ffmpegCommand}`)
  exec(ffmpegCommand, (fferror, ffstdout, ffstderr) => {
    if (fferror) {
      console.error('Error:', fferror);
      res.status(500).send('Error:', fferror);
    }
    const response = {
      messagge: 'File converted!',
      sourceVideoPath: req.file.path,
      outputName: outputName,
      codec: command
    };
    res.status(200).send(response);
  });
});

/**
 * Handles the POST request for the /metrics endpoint.
 * Executes FFmpeg command to calculate the quality metrics of the video and returns the video converted along with its quality metrics.
 * 
 * @param {import('express').Request} req - The request object.
 * @param {string} outputName - The name of the output file.
 * @param {string} sourceVideoPath - The path of the source video.
 * @param {string} codec - The codec used to convert the video.
 * 
 * @param {import('express').Response} res - The response object.
 * @param {object} response.filename - The name of the output file.
 * @param {object} response.codec - The codec used to convert the video.
 * @param {object} response.size - The size of the output file.
 * @param {object} response.quality_metrics - The quality metrics of the output file. 
 * 
 */
app.post('/metrics', (req, res) => {
  const { outputName, sourceVideoPath, codec } = req.body;

  const qualityMetricsCommand = `ffmpeg-quality-metrics results/${outputName} ${sourceVideoPath} -m psnr ssim vmaf`
  console.log(`-- QUALITY METRICS: ${qualityMetricsCommand}`)
  exec(qualityMetricsCommand, (qmError, qmStdout, qmStderr) => {
    if (qmError) {
      console.error('Error:', qmError);
      res.status(500).send('Error:', qmError);
    }
    
    const filePath = `results/${outputName}`;
    console.log(`-- FILE SIZE: ${filePath}`)
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).send('Error:', err);
      }
      const fileSize = (parseInt(stats.size) * 0.000001).toFixed(2);

      const response = {
        filename: outputName,
        codec: codec,
        size: fileSize,
        quality_metrics: JSON.parse(qmStdout),
      };    
      res.status(200).send(response);
    });
  });
});


/**
 * Shows the port where the server is running.
 * @param {number} PORT - The port number.
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
