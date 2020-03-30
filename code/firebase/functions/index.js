//Virtual Tours
//Featuring top attractions in cities where G. has offices
//By @lizmyers, @lguinn 
//Advisors: @pvergadia
//March 29, 2020
//Version 1.35
//License: MIT? - open source. learning project

'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'ws://virtual-tours-usycht.firebaseio.com/'
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const userCity = 'San Francisco';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeHandler(agent) {
    var today = new Date();
    var curHr = today.getHours();
    var greet = "";
    
    const welcome = `<speak><audio src="https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"></audio></speak> Let's take a virtual tour of `+ userCity + `. Are you more interested in landmarks, museums, or cultural icons?` ;
    
    //const welcome = `Let's take a virtual tour. Where would you like to go - San Francisco or London`;
     
      if (curHr < 12) {
        greet = "Good morning! " + welcome;
      } else if (curHr < 18) {
        greet = 'Good afternoon! ' + welcome + '<speak><audio src="https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"></audio></speak>';
      } else {
        greet = "Good evening! " + welcome;
      }

    agent.add(greet);
    agent.add(new Suggestion (`landmarks`));
    agent.add(new Suggestion (`museums`));
    agent.add(new Suggestion (`cultural icons`));
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
    const userCity = agent.parameters.city;
    const getCategoryMsg = `Got it -   ` + userCity + `. Are you interested in landmarks, museums, or cultural icons?`;

    agent.add(getCategoryMsg);
    agent.add(new Suggestion (`landmarks`));
    agent.add(new Suggestion (`museums`));
    agent.add(new Suggestion (`cultural icons`));
 }
  
  //LM to loop thru snapshot and generate options PROGRAMMATICALLY
  function getCategoryHandler(agent) {
    let userCat = agent.parameters.category;
    if(userCity == 'San Francisco') {
          switch(userCat){
            case 'cultural icons':
            case 'icons':
              agent.add('The cultural icons I have are: Cable Cars, Union Square, and Beach Blanket Babylon Revue.');
              agent.add(new Suggestion(`Cable Cars`));
              agent.add(new Suggestion(`Union Square`));
              agent.add(new Suggestion(`Beach Blanket Babylon...`));
              break;
            case 'landmarks':
              agent.add('The landmarks I have are: Sutro Baths, Angel Island, and Winchester Mystery House.');
              agent.add(new Suggestion(`Sutro Baths`));
              agent.add(new Suggestion(`Angel Island`));
              agent.add(new Suggestion(`Winchester House`));
              break;
            case 'museums':
              agent.add(' The museums I have are:  Asian Art Museum, De Young Museum, and Monterey Bay Aquarium');
              agent.add(new Suggestion(`Asian Art Museum`));
              agent.add(new Suggestion(`De Young Museum`));
              agent.add(new Suggestion(`Monterey Bay Aquarium`));
              break;
          }
    } else if(userCity == 'London'){
            switch(userCat){
              case 'cultural icons':
              case 'icons':
                agent.add('Sure. The cultural icons I have are: Picadilly Circus, Fortnum and Mason, and Tower of London.');
                agent.add(new Suggestion(`Picadilly Circus`));
                agent.add(new Suggestion(`Fortnum & Mason`));
                agent.add(new Suggestion(`Tower of London`));
                break;
              case 'landmarks':
                agent.add('The landmarks I have are: Big Ben, Buckingham Palace, and Westminster Abbey');
                agent.add(new Suggestion(`Big Ben`));
                agent.add(new Suggestion(`Buckingham Palace`));
                agent.add(new Suggestion(`Westminster Abbey`));
                break;
              case 'museums':
                agent.add('Alright. For museums we have The Tate Modern, British Museum, and The Natural History Museum');
                agent.add(new Suggestion(`Tate Modern`));
                agent.add(new Suggestion(`British Museum`));
                agent.add(new Suggestion(`Natural History`));
                break;
            }
      }
    agent.add(`Which would you like?`);
  }

  function getSiteHandler(agent) {
    const userSite = agent.parameters.site;
    //let userSiteNameLowerCase = userSiteName.toLowerCase;
    //const userSite = userSiteNameLowerCase.capitalize();
   
    return admin.database().ref(userCity).once('value').then((snapshot) => {
     
      //setup vars to build a display card
      const minTime = snapshot.child('/' + userSite + '/min_time').val();
      const maxTime = snapshot.child('/' + userSite + '/max_time').val();
      const duration = `TIME: `+ minTime + ` - ` + maxTime + ' hours';
      const category = snapshot.child('/' + userSite + '/category').val(); 
      const what = snapshot.child('/' + userSite + '/what').val();
      const why = snapshot.child('/' + userSite + '/why').val();
      const image = snapshot.child('/' + userSite + '/image').val();
      const link = snapshot.child('/' + userSite + '/more').val();

       if(what !== null){
         
            agent.add(`Here's what I have for ${userSite} .`);

            //display a card w/image from Firebase Storage
            
            agent.add(new Card({
                title: userSite,
                subtitle: category,
                text: duration + '  \n  \n WHAT: ' + what + '  \n  \n WHY: ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link,
            })
          );

       } else { //couldn't access data
         //agent.add(`Sorry, I couldn't find the data.`);
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
