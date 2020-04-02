//Virtual Tours
//Featuring top attractions in cities where G. has offices
//By @lizmyers, @lguinn 
//Advisors: @pvergadia, @jearleycha
//April 2, 2020
//Version 1.4.0

'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
//const {Image} = require('actions-on-google');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'ws://virtual-tours-usycht.firebaseio.com/'
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

let userCity = '';
let userCat = '';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeHandler(agent) {
    var today = new Date();
    var curHr = today.getHours();
    var greet = ``;

    const welcome = `Let's take a virtual tour. Where would you like to go - San Francisco or London`;
     
      if (curHr < 12) {
        greet = "Good morning! " + welcome;
      } else if (curHr < 18) {
        greet = 'Good afternoon! ' + welcome;
      } else {
        greet = "Good evening! " + welcome;
      }

    agent.add(greet);
    agent.add(new Suggestion (`San Francisco`));
    agent.add(new Suggestion (`London`));
  }

  const randomErrorMsgs = [
   `Whoops a daisy! I didn't get that. Could you please try again?`,
   `Hmm, that's odd. I don't see anything. Please try again`,
   `Sorry, my bad. Could you try that again?`,
   `Oh dear, something has gone wrong. Would you please try again?`,
   `I can't find anything here. Could you please try again?`,
   `Whoops a daisy! I didn't get that. Could you please try again?`,
   `Hmm, that's odd. I don't see anything - please try again`,
   `Sorry, my bad. Could you try that again?`,
   `Oh dear, something has gone wrong. Would you please try again?`,
   `Bummer, I can't find anything.  Could you please try again?`,
  ];

  const fallbackErrorMsgs = [
    `Sorry, I didn't catch the city name. Where would you like to go?`,
    `Sorry, I didn't understand the city name. Would you like to go to San Francisco or London?`,
    `Sorry, my bad. Could you try that again?`,
    `Oh dear, something webt wrong. Could you please say or select one of the suggestions below?`,
    `Sorry, a train went past just as you said that. Could you please try again?`,
    `Whoops a daisy! I didn't get that. Could you please try again?`,
    `Sorry, it's noisy here. Did you say London or San Francisco`,
    `Sorry, my bad. Could you try that again?`,
    `Oh dear, something has gone wrong. Would you please try again?`,
    `Bummer, I didn't get that.  Did you say London or San Francisco?`,
   ];
  
  //fallback used in followup intent to get city
  function welcomeFallbackHandler(agent) {
    let randomInt = getRandomErrorMsg(0, 9);
    let fallbackErrorMsg = fallbackErrorMsgs[randomInt];
    agent.add(fallbackErrorMsg);
  }

  function getCityHandler(agent){
    userCity = agent.parameters.city;
    const getCategoryMsg = `Got it,  ` + userCity + `. Are you interested in landmarks, museums, or cultural icons?`;

    agent.add(getCategoryMsg);
    agent.add(new Suggestion (`landmarks`));
    agent.add(new Suggestion (`museums`));
    agent.add(new Suggestion (`icons`));
 }
  
  function getCategoryHandler(agent) {
    
  userCat = agent.parameters.category;

  return admin.database().ref(userCity).once('value').then((snapshot) => {
      var sitesArr = [];
        snapshot.child('/' + userCat + '/').forEach(data => {
          var site = '';
          site = data.key;
          sitesArr.push(site);
        })
     
        agent.add(`Here are the `+ userCat +` I have: ` 
        + sitesArr[0] + ', ' + sitesArr[1] + `,  and `+ sitesArr[2]);
        agent.add(new Suggestion(sitesArr[0]));
        agent.add(new Suggestion(sitesArr[1]));
        agent.add(new Suggestion(sitesArr[2]));     
        agent.add(`Which would you like?`);
    })
  }

  function getSiteHandler(agent) {
    const userSite = agent.parameters.site;
    //let userSiteNameLowerCase = userSiteName.toLowerCase;
    //const userSite = userSiteNameLowerCase.capitalize();
   
    return admin.database().ref(userCity).once('value').then((snapshot) => {
     
      //setup vars to build a display card
      const minTime = snapshot.child( '/' + userCat + '/' + userSite + '/min_time').val();
      const maxTime = snapshot.child('/' + userCat + '/' + userSite + '/max_time').val();
      const duration = `TIME: `+ minTime + ` - ` + maxTime + ' hours';
      const category = snapshot.child('/' + userCat + '/' + userSite + '/category').val(); 
      const what = snapshot.child('/' + userCat + '/' + userSite + '/what').val();
      const why = snapshot.child('/' + userCat + '/' + userSite + '/why').val();
      const image = snapshot.child('/' + userCat + '/' + userSite + '/image').val();
      const link = snapshot.child('/' + userCat + '/' + userSite + '/more').val();

       if(what !== null){
         
            agent.add(`Here's what I have for ${userSite} .`);

            //display a card w/image from Firebase Storage
            
            agent.add(new Card({
                title: userSite,
                subtitle:category,
                text: duration + '  \n  \n WHAT: ' + what + '  \n  \n WHY: ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link,
            })
          );
       } else { //couldn't access data
         let randomInt = getRandomErrorMsg(0, 9);
         let errorMsg = randomErrorMsgs[randomInt];
         agent.add(errorMsg);
       } //end if/else
    }); // end snapshot
  }//end handler function

  let intentMap = new Map();
  intentMap.set('Welcome_Intent', welcomeHandler);
  intentMap.set('Welcome_Fallback_Intent', welcomeFallbackHandler);
  intentMap.set('Get_City_Intent', getCityHandler);
  intentMap.set('Get_Category_Intent', getCategoryHandler);
  intentMap.set('Get_Site_Intent', getSiteHandler);
  agent.handleRequest(intentMap);
});

// Helper Functions ------------------------------------------------------------------------------
String.prototype.capitalize = function() {
  return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};
//This function helps generate random hello, goodbye, and error responses
function getRandomErrorMsg(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  let randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomInt;
}
