const axios = require('axios');
const jsdom = require('jsdom');
const { Canvas, Image, ImageData, createCanvas, loadImage } = require('canvas');
const { JSDOM } = jsdom;
const tf = require('@tensorflow/tfjs-node');
const modelPaths = require('./paths');
const tfImage = require('@teachablemachine/image');
const request = require('request');
const cocoSSD = require('@tensorflow-models/coco-ssd');
const faceapi = require('face-api.js');
const { createWorker, createScheduler, OEM } = require('tesseract.js');
const vision = require('@google-cloud/vision');
require('@tensorflow/tfjs-node');

// needed to overcome tensorflow dom requirements
const dom = new JSDOM('<!DOCTYPE html>');
global.fetch = require('node-fetch');
global.document = dom.window.document;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// define models
let maleClothingModel = '';
let femaleClothingModel = '';
let modelsLoaded = false;

const worker = createWorker();
const client = new vision.ImageAnnotatorClient();

const loadModels = async () => {
  if (modelsLoaded) {
    console.log('\nMODELS ALREADY LOADED\n');
  } else {
    maleClothingModel = await tfImage.load(
      modelPaths.maleClothedV3.model,
      modelPaths.maleClothedV3.metadata
    );

    femaleClothingModel = await tfImage.load(
      modelPaths.femaleClothedV2.model,
      modelPaths.femaleClothedV2.metadata
    );

    await faceapi.nets.ssdMobilenetv1.loadFromDisk('classification/faceAPI');
    await faceapi.nets.ageGenderNet.loadFromDisk('classification/faceAPI');

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    modelsLoaded = true;
  }
};

const getTensor3dObject = async imageURL => {
  let req = await axios.get(imageURL, {
    responseType: 'arraybuffer'
  });
  // 3 = jpg, 4 = png
  return tf.node.decodeJpeg(req.data, 3);
};

// ----- CLASSIFICATION FUNCTIONALITY ----- //

let results = {
  gender: '',
  topless: '',
  clothed: '',
  text: []
};

const detectAgeGender = async image => {
  let img = await loadImage(image);
  let ageGenderResults = await faceapi.detectAllFaces(img).withAgeAndGender();
  let gender;
  if (ageGenderResults[0] !== undefined) {
    gender = ageGenderResults[0].gender;
  } else {
    gender = 'N/A';
  }
  return gender;
};

const detectClothing = async image => {
  let gender = await detectAgeGender(image);
  let canvasImage = await loadImage(image);

  if (gender === 'male') {
    let classifcation = await maleClothingModel.predict(canvasImage);
    results.gender = 'male';
    results.topless = classifcation[0].probability;
    results.clothed = classifcation[1].probability;
  } else if (gender === 'female') {
    let classifcation = await femaleClothingModel.predict(canvasImage);
    results.gender = 'female';
    results.topless = classifcation[0].probability;
    results.clothed = classifcation[1].probability;
  } else {
    results.gender = 'N/A';
    results.topless = 'N/A';
    results.clothed = 'N/A';
  }

  return results;
};

const convertText = async image => {
  // remove 'data:image/jpeg;base64,' from string
  var base64result = image.split(',')[1];

  const request = {
    image: {
      content: base64result
    }
  };

  const [result] = await client.textDetection(request);
  const detections = result.textAnnotations;

  if (detections.length !== 0) {
    console.log('Text:');
    detections.forEach(text => results.text.push(text.description));
  } else {
    console.log('No text detected');
  }

  return results;
};

module.exports = {
  loadModels,
  detectClothing,
  detectAgeGender,
  convertText
};
