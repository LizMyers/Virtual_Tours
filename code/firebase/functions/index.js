//Virtual Tours
//Featuring the best attractions in cities where G. has offices
//By Liz Myers
//Content by: Lisa Guinn (SF)
//Advisors: Jessica Dene Earley-Cha, Priyanka Vergadia
//April 11, 2020
//Version 1.6

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

let userCity = '';
let userCat = '';
let userSite = '';
let randomSite = '';

const randomSurpriseMsgs = [
  `surprise me`,
  `roll the dice`,
  `spin the wheel`,
  `dealer's choice`,
  `russian roulette`,
  `take a chance`,
  `random choice`,
  `let's live dangerously`,
  `live on the wild side`
];

const randomInt = getRandom(0, 6);
const randomSurpriseMsg = randomSurpriseMsgs[randomInt];

//welcome and help messages 
const randomHelpMsgs = [
  `Let's travel vicariously to cities where Google has offices. Choose from London and San Francisco. Or you can say: `+ randomSurpriseMsg + `. Now, what'll it be?`,
  `Let's enjoy a little armchair travel. Would you like to see the sites in London or San Francisco? Or, you can say: ` + randomSurpriseMsg + `.`,
  `Where should we go today? London, San Francisco?  Or you can say: `+ randomSurpriseMsg + `.  Now, what'll it be?`,
  `Where should we go today- London or  San Francisco? Or you can say: `+ randomSurpriseMsg + `.`,
  `Let's go (virutally) to cities where Google has offices. Choose from London and San Francisco. Or you can say: `+ randomSurpriseMsg + `. Now, what'll it be?`,
  `Let's enjoy a little armchair travel. Would you like to see the sites in London or San Francisco?  Or you can say: `+ randomSurpriseMsg + `. Now, what'll it be?`,
  `Where should we go today? London or San Francisco? Or you can say: `+ randomSurpriseMsg + `.`,
];

//Error messages for all errors throughout action (except city selection)
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

//Error messages for capturing city name and starting action
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

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeHandler(agent) {
    var today = new Date();
    var curHr = today.getHours();
    var greet = ``;
    
    var welcomeMsg = randomHelpMsgs[randomInt];
   
    if (curHr < 12) {
      greet = "Good morning! " + welcomeMsg;
    } else if (curHr < 18) {
      greet = 'Good afternoon! ' + welcomeMsg;
    } else {
      greet = "Good evening! " + welcomeMsg;
    }
    agent.add(greet);
    agent.add(new Suggestion (`San Francisco`));
    agent.add(new Suggestion (`London`));
    agent.add(new Suggestion (randomSurpriseMsg));
  }

  function helpHandler(){
    let randomInt = getRandom(0, 7);
    let helpMsg = randomHelpMsgs[randomInt];
    agent.add(helpMsg);
  }
  
  //fallback used in followup intent to get city
  function welcomeFallbackHandler(agent) {
    let randomInt = getRandom(0, 9);
    let fallbackErrorMsg = fallbackErrorMsgs[randomInt];
    agent.add(fallbackErrorMsg);
  }

  function getCityHandler(agent){
    userCity = agent.parameters.city;
    const getCategoryMsg = `Got it. What do you fancy? Landmarks, museums, or cultural icons?`;

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
        });
     
        agent.add(`Here are the `+ userCat +` I have: ` + sitesArr[0] + ', ' + sitesArr[1] + `,  and `+ sitesArr[2]);
        agent.add(new Suggestion(sitesArr[0]));
        agent.add(new Suggestion(sitesArr[1]));
        agent.add(new Suggestion(sitesArr[2]));     
        agent.add(`Which would you like?`);
    });
  }

  function getRandomSiteHandler(){
    let masterCitiesArray = [`London`, `San Francisco`];
    let masterCategoriesArray = [`Landmarks`, `Museums`, `Cultural Icons`];
    let masterSitesArray = [
      `Big Ben`,
      `Buckingham Palace`,
      `Fortnum And Mason`,
      `Natural History Museum`,
      `Picadilly Circus`,
      `British Museum`,
      `Tate Modern`,
      `Tower of London`,
      `Westminster Abbey`,
      `Cable Cars`,
      `Union Square`,
      `Beach Blanket Revue`,
      `Sutro Baths`,
      `Angel Island`,
      `Winchester Mystery House`,
      `Asian Art Museum`,
      `De Young Museum`,
      `Monterey Bay Acquarium`
    ];
    let randomSiteInt = getRandom(0, 17);
    randomSite = masterSitesArray[randomSiteInt];
    userSite = randomSite;
    agent.add(`This time, you're going to: ` + randomSite + `!`);
    








  }
//This function fetches data from Realtime Database & displays it on a basic card
  function getSiteHandler(agent) {
    userSite = agent.parameters.site;
    //let userSiteNameLowerCase = userSiteName.toLowerCase;
    //const userSite = userSiteNameLowerCase.capitalize();
   
    return admin.database().ref(userCity).once('value').then((snapshot) => {
     
      //setup vars to build a display card
      const minTime = snapshot.child( '/' + userCat + '/' + userSite + '/min_time').val();
      const maxTime = snapshot.child('/' + userCat + '/' + userSite + '/max_time').val();
      const duration = '**Time:**  ' + minTime + ' - ' + maxTime + ' hours';
      const category = snapshot.child('/' + userCat + '/' + userSite + '/category').val(); 
      const what = snapshot.child('/' + userCat + '/' + userSite + '/what').val();
      const why = snapshot.child('/' + userCat + '/' + userSite + '/why').val();
      const image = snapshot.child('/' + userCat + '/' + userSite + '/image').val();
      const link = snapshot.child('/' + userCat + '/' + userSite + '/more').val();

       if(what !== null){
         
            //agent.add(`Here's what I have for that: `);

			if(userSite == 'Cable Cars'){
            	//play a sound to test ssml
            	agent.add('<speak><audio src="https://actions.google.com/sounds/v1/transportation/ship_bell.ogg"><desc>Cable Car Bell</desc>Cable Car (sound didn\'t load)</audio></speak>');
            }
            agent.add(new Card({
                title: userSite,
                subtitle:category,
                text: duration + '  \n  \n **What:**  ' + what + '  \n  \n **Why:**  ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link,
            })
          );
       } else { //couldn't access data
         let randomInt = getRandom(0, 9);
         let errorMsg = randomErrorMsgs[randomInt];
         agent.add(errorMsg);
       } //end if/else
    }); // end snapshot
  }//end handler function

  let intentMap = new Map();
  intentMap.set('Welcome_Intent', welcomeHandler);
  intentMap.set('Welcome_Fallback_Intent', welcomeFallbackHandler);
  intentMap.set('Help_Intent', helpHandler);
  intentMap.set('Get_City_Intent', getCityHandler);
  intentMap.set('Get_Category_Intent', getCategoryHandler);
  intentMap.set('Get_Site_Intent', getSiteHandler);
  intentMap.set('Get_Random_Site_Intent', getRandomSiteHandler);
  agent.handleRequest(intentMap);
});

// Helper Functions ------------------------------------------------------------------------------
String.prototype.capitalize = function() {
  return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};
//This function helps generate random hello, goodbye, and error responses
function getRandom(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  let randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomInt;
}
