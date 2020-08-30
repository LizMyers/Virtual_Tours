//Virtual Tours
//Featuring the best attractions in cities where G. has offices
//By Liz Myers
//Content by: Lisa Guinn (SF)
//Advisors: Jessica Dene Earley-Cha, Priyanka Vergadia
//April 12, 2020
//Version 1.7.1

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
let sitesArray = [];
let deviceLocation = '';


const randomSurpriseMsgs = [
  `make it a surprise`,
  `roll the dice`,
  `spin the wheel`,
  `play Russian roulette`,
  `take a chance`,
  `pick a random one`,
  `live dangerously`,
  `live on the wild side`
];

let randomIntSurprise = getRandom(0, 7);
let randomSurpriseMsg = randomSurpriseMsgs[randomIntSurprise];

//welcome and help messages 
const randomHelpMsgs = [
  `Let's travel vicariously to cities where Google has offices. See the sites in London, Dublin, or San Francisco. Or shall we `+ randomSurpriseMsg + `?`,
  `Let's enjoy a little armchair travel. Would you like to see the sites in London, Dublin, or San Francisco? Or shall we ` + randomSurpriseMsg + `.`,
  `Where shall we go (virtually!) and what shall we do today? London, Dublin, or San Francisco?  Or shall we `+ randomSurpriseMsg + `?`,
  `Forget the travel ban! Let's see major sites (virtually!) in cities where Google has offices. Choose from London, Dublin, or San Francisco. Or shall we `+ randomSurpriseMsg + `?`,
 `Let's enjoy a little armchair travel. Would you like to see the sites in London, Dublin, or San Francisco?  Or you can say: `+ randomSurpriseMsg + `. Now, what'll it be?`,
  `What shall we do today? Shall we see the sites in London, Dublin, or San Francisco?  Or you can say: `+ randomSurpriseMsg + `. Now, what'll it be?`
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
    let today = new Date();
    let curHr = today.getHours();
    let greet = ``;
    let randomWelcomeInt = getRandom(0, 5);
    let welcomeMsg = randomHelpMsgs[randomWelcomeInt];
   
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
    agent.add(new Suggestion (`Dublin`));
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
    //deviceLocation = agent.parameters.device.location;
    const getCategoryMsg = `Got it. What do you fancy? Landmarks, museums, or cultural icons?`;

    //agent.add(getCategoryMsg);
    //agent.add(`Your device location is: ` + deviceLocation);
    agent.add(getCategoryMsg);
    agent.add(new Suggestion (`landmarks`));
    agent.add(new Suggestion (`museums`));
    agent.add(new Suggestion (`icons`));
 }
  
  function getCategoryHandler(agent) {
    
  userCat = agent.parameters.category;

  //returns the 3 sites for a given city and category
  return admin.database().ref(userCity).once('value').then((snapshot) => {
        sitesArray = [];
        snapshot.child('/' + userCat + '/').forEach(data => {
          var site = '';
          site = data.key;
          sitesArray.push(site);
        });
     
        agent.add(`Here are the `+ userCat +` I have: ` + sitesArray[0] + ', ' + sitesArray[1] + `,  and `+ sitesArray[2]);
        agent.add(new Suggestion(sitesArray[0]));
        agent.add(new Suggestion(sitesArray[1]));
        agent.add(new Suggestion(sitesArray[2]));     
        agent.add(`Which would you like?`);
    });
  }

  function getRandomSiteHandler(){

    //TO-DO: populate cities programmatically for scale
    const masterCitiesArray = [`London`, `Dublin`, `San Francisco`];
    const masterCategoriesArray = [`landmarks`, `museums`, `icons`];

    //pick random city
    const randomCityInt = getRandom(0, 2);
    const randomCity = masterCitiesArray[randomCityInt];

    //get random category
    const randomCatInt = getRandom(0, 2);
    const randomCat = masterCategoriesArray[randomCatInt];

    //return the 3 sites for a random city and random category
    return admin.database().ref(randomCity).once('value').then((snapshot) => {
        sitesArray = [];
        snapshot.child('/' + randomCat + '/').forEach(data => {
          var site = '';
          site = data.key;
          sitesArray.push(site);
        });
      
    //get random site
    const randomSiteInt = getRandom(0, 2);
    const randomSite = sitesArray[randomSiteInt];

    //setup vars to build a display card
    const minTime = snapshot.child( '/' + randomCat + '/' + randomSite + '/min_time').val();
    const maxTime = snapshot.child('/' + randomCat + '/' + randomSite + '/max_time').val();
    const duration = '**Time needed:**  ' + minTime + ' - ' + maxTime + ' hours';
    const randCity = '**City:**  ' + randomCity; //needed for random where displayed out of context
    const what = snapshot.child('/' + randomCat + '/' + randomSite + '/what').val();
    const why = snapshot.child('/' + randomCat + '/' + randomSite + '/why').val();
    const image = snapshot.child('/' + randomCat + '/' + randomSite + '/image').val();
    const link = snapshot.child('/' + randomCat + '/' + randomSite + '/more').val();

       if(what !== null){

            ////////////////////////////////// EXAMPLE SOUND EFFECT ///////////////////////////////////
			      // if(userSite == 'Cable Cars'){
            // 	//play a sound to test ssml
            // 	agent.add('<speak><audio src="https://actions.google.com/sounds/v1/transportation/ship_bell.ogg"><desc>Cable Car Bell</desc>Cable Car (sound didn\'t load)</audio></speak>');
            // }

            //Display Card
            if(link !== 'na'){//This card has a more link
              agent.add(new Card({
                title: randomSite,
                text: randCity + '  \n  \n' + duration + '  \n  \n**What is it?**  ' + what + '  \n   \n**Why go?**  ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link
                }));
            }else{
              agent.add(new Card({//This card does not have a more link
                title: randomSite,
                text: randCity + '  \n  \n' + duration + '  \n  \n**What is it?**  ' + what + '  \n   \n**Why go?**  ' + why,
                imageUrl: image
                }));
            }
       
       } else { //couldn't access data
         let randomInt = getRandom(0, 9);
         let errorMsg = randomErrorMsgs[randomInt];
         agent.add(errorMsg);
       } //end if/else
    }); // end snapshot
  }//end getRandomSiteHandler

//This function fetches data from Realtime Database & displays it on a card
  function getSiteHandler(agent) {
    userSite = agent.parameters.site;
    //let userSiteNameLowerCase = userSiteName.toLowerCase;
    //const userSite = userSiteNameLowerCase.capitalize();
   
    return admin.database().ref(userCity).once('value').then((snapshot) => {
     
      //setup vars to build a display card
      const minTime = snapshot.child( '/' + userCat + '/' + userSite + '/min_time').val();
      const maxTime = snapshot.child('/' + userCat + '/' + userSite + '/max_time').val();
      const duration = '**Time needed:**  ' + minTime + ' - ' + maxTime + ' hours';
      const what = snapshot.child('/' + userCat + '/' + userSite + '/what').val();
      const why = snapshot.child('/' + userCat + '/' + userSite + '/why').val();
      const image = snapshot.child('/' + userCat + '/' + userSite + '/image').val();
      const link = snapshot.child('/' + userCat + '/' + userSite + '/more').val();

       if(what !== null){

			      if(userSite == 'Cable Cars'){
            	//play a sound to test ssml
            	agent.add('<speak><audio src="https://actions.google.com/sounds/v1/transportation/ship_bell.ogg"><desc>Cable Car Bell</desc>Cable Car (sound didn\'t load)</audio></speak>');
            }

            //Display Card
            if(link !== 'na'){
              agent.add(new Card({
                title: userSite,
                text: duration + '  \n  \n**What is it?**  ' + what + '  \n  \n**Why go?**  ' + why,
                imageUrl: image,
                buttonText: 'more',
                buttonUrl: link,
                }));
            }else{
              agent.add(new Card({
                title: userSite,
                text: duration + '  \n  \n**What is it?**  ' + what + '  \n  \n**Why go?**  ' + why,
                imageUrl: image,
                }));
            }
     
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