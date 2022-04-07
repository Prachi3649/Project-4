const validUrl = require('valid-url');
const shortid = require('shortid')
const urlModel = require('../models/urlModel')

//redis require
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  10139, //port no
  "redis-10139.c212.ap-south-1-1.ec2.cloud.redislabs.com", //link
  { no_ready_check: true }
);
redisClient.auth("fmErWYpdckW0xrYD5eb5wgus7kThMh1t", function (err) { //password
  if (err) throw err;
});

// it's provide connection
redisClient.on("connect", async function () {
  console.log("Connected to Redis Ready..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const isValid = function (value) {
    if (typeof (value) === 'undefined' || typeof (value) === 'null') 
    { return false } 
    //if undefined or null occur rather than what we are expecting than this particular feild will be false.
    if (value.trim().length == 0)
     { return false } 
     //if user give spaces not any string eg:- "  " =>here this value is empty, only space is there so after trim if it becomes empty than false will be given. 
    if (typeof (value) === 'string' && value.trim().length > 0) 
    { return true } 
    //to check only string is comming and after trim value should be their than only it will be true.
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}


const createurl = async function (req, res) {

    try {
        if (!isValidRequestBody(req.body)) {
            res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide URL details' })
            return
        }
        if (!isValid(req.body.longUrl)) {
            return res.status(400).send({ status: false, message: ' Please provide LONG URL' })
        }
       
       // (/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
        const longUrl = req.body.longUrl

      
         
       let URL = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
        
       //Validation of longUrl            
       if(!URL.test(longUrl)) {
        return res.status(400).send({status: false, message: "longurl is not valid please provide valid url like http,www,https"})
        }
       
           
        // if (!(validUrl.isUri(longUrl))) {
        // return res.status(400).send({ status: false, msg: "longurl is not valid" })
        // }
        

      
        const baseUrl = 'http://localhost:3000' //base Url

        //---GENERATE URLCODE
        let urlCode = shortid.generate().match(/[a-z\A-Z]/g).join("") //---this will give only Alphabet
       
        urlCode = urlCode.toLowerCase()  //lowercase 
        
        let newSet = await SET_ASYNC (urlCode, longUrl)
        console.log(newSet)
        
        let url = await urlModel.findOne({ longUrl })

        if (url) {
            return res.status(200).send({ status: true, "data": url }) //---if already exist
         }
        //---GENERATE DATA BY LONG URL
        const shortUrl = baseUrl + '/' + urlCode
        const urlData = { urlCode, longUrl, shortUrl }//new url 

        const newurl = await urlModel.create(urlData);

    let longurl=newurl.longUrl
    let shorturl=newurl.shortUrl
    let urlcode=newurl.urlCode
    let data=({longurl,shorturl,urlcode})
 
     return res.status(201).send({ status: true, msg: `URL created successfully`, data:data});
        
    } catch (err) {
       return  res.status(500).send({  msg: err.message })
    }
}

const geturl = async function (req, res) {
    try {
        const urlcode = req.params.urlCode.trim()

        let newUrlcode =await GET_ASYNC (urlcode)
        console.log(newUrlcode)

        if (!isValid(newUrlcode)) {
            return res.status(400).send({ status: false, message: ' invalid Please provide valid urlCode' })
        }
        
        

        const url = await urlModel.findOne({ urlCode: urlcode })     //check in Db

        if (!url) {
            return res.status(404).send({ status: false, message: 'No URL Found' })
        }
        
        await SET_ASYNC(`${urlcode}`, JSON.stringify(url))
        return res.status(302).redirect(url.longUrl)

    } catch (err) {

        res.status(500).send({ msg: err.message })
    }
}


module.exports.createurl = createurl
module.exports.geturl = geturl