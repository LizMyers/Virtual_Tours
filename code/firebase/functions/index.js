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

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcomeHandler(agent) {
    var today = new Date();
    var curHr = today.getHours();
    var greet = "";
    var welcome = `Let's see the top sights in London. What strikes your fancy? Landmarks, museums, or cultural icons?`;
     
      if (curHr < 12) {
        greet = "Good morning! " + welcome;
      } else if (curHr < 18) {
        greet = "Good afternoon! " + welcome;
      } else {
        greet = "Good evening! " + welcome;
      }

    agent.add(greet);
  }
 
  function fallbackHandler(agent) {
    agent.add(`Sorry, I didn't get that`);
    agent.add(`Please try again?`);
  }
  
  function getCategoryHandler(agent) {
    let userCat = agent.parameters.category;
    switch(userCat){
      case 'cultural icons':
      case 'icons':
      	agent.add('Sure. The cultural icons I have are: Picadilly Circus, Fortnum and Mason, and Tower of London.');
    	break;
      case 'landmarks':
        agent.add('The landmarks I have are: Big Ben, Buckingham Palace, and Westminster Abbey');
    	break;
      case 'museums':
        agent.add('Alright. For museums we have The Tate Modern, British Museum, and The Natural History Museum');
    	break;
    }
    agent.add(`Which would you like?`);
  }

  function getSiteHandler(agent) {
    const userSite = agent.parameters.site;
    return admin.database().ref('LonSites/').once('value').then((snapshot) => {
     
      //setup vars to build a display card
      const minTime = snapshot.child(userSite + '/min_time').val();
      const maxTime = snapshot.child(userSite + '/max_time').val();
      const duration = `TIME: `+ minTime + ` - ` + maxTime + ' hours';

      const what = snapshot.child(userSite + '/what').val();
      const why = snapshot.child(userSite + '/why').val();
      const image = snapshot.child(userSite + '/image').val();
      const link = snapshot.child(userSite + '/more').val();

       if(what !== null){
         
        //speak a final phrase
        //@Priyanka how to have the agent speak more of the result if there's no surface/display?
        //Conversely, if we have a display - maybe we should drop the final spoken 'Have fun...'
        agent.add(`Have fun at  ${userSite} !`);
       
        //display a card
        agent.add(new Card({
            title: userSite,
            subtitle: `Landmarks`,
            text: duration + '  \n  \n WHAT: ' + what + '  \n  \n WHY: ' + why,
            buttonText: `more`,
            buttonUrl: link,
            //image: 'https://firebasestorage.googleapis.com/v0/b/virtual-tours-usycht.appspot.com/o/big_ben.jpg'
        })
        );//end card
       } else { //couldn't access data
         agent.add(`Sorry, I couldn't find the data.`)
       } //end if/else
    }); // end snapshot
  }//end handler function

  let intentMap = new Map();
  intentMap.set('Welcome_Intent', welcomeHandler);
  intentMap.set('Fallback_Intent', fallbackHandler);
  intentMap.set('Get_Category_Intent', getCategoryHandler);
  intentMap.set('Get_Site_Intent', getSiteHandler);
  agent.handleRequest(intentMap);
});

// Helper Functions ------------------------------------------------------------------------------

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}