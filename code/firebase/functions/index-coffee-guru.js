'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements
admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const flavorsArray = getInventory(db);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request,response});

    function welcomeHandler(agent) {
        var today = new Date();
        var curHr = today.getHours();
        var greet = "";
        var hints = "You can ask for specific flavors, or I can make a suggestion. Which would you like?";
        if (curHr < 12) {
            greet = "Good morning! " + hints;
        } else if (curHr < 18) {
            greet = "Good afternoon! " + hints;
        } else {
            greet = "Good evening! " + hints;
        }
        agent.add(greet);
    }

    function suggestFlavorHandler(agent) {
        let flavorsArrayCopy = flavorsArray;
        let flavorIndex = Math.floor(Math.random() * flavorsArrayCopy.length);
        let randomFlavor = flavorsArrayCopy[flavorIndex];
      
      	//remove this flavor from array to prevent duplicates in this session
        if(flavorsArrayCopy.length > 2){
        	removeElement(flavorsArrayCopy, randomFlavor); 
        }
        let flavorName = capitalize(randomFlavor);
        if(flavorName == 'Livanto'){
          flavorName = '<say-as interpret-as="italian">Liv-AHNtoe</say-as>';
        }
        const dialogflowAgentDoc = db.collection('nespresso').doc(randomFlavor);
		
        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I\'m all out of suggestions right now.');
                } else {
                    agent.add('<speak>I suggest ' + flavorName + '.  It\'s ' + doc.data().description +  ', <break time ="500ms"/> has a strength of ' + doc.data().strength + ', <break time ="300ms"/> and we have ' + doc.data().count + ' on hand. How about this one?</speak>');
                    agent.setContext({
                        name: 'suggestion',
                        lifespan: 3,
                        parameters: {
                            flavor: randomFlavor,
                            flavorsArray: flavorsArrayCopy
                        }
                    });
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
    }

    function suggestFlavorYesHandler(agent) {
        const requestedFlavor = agent.getContext('suggestion').parameters.flavor;
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);

        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I\'m having trouble right now!');
                } else {
                    const count = doc.data().count;
                    const newcount = count - 1;
                    updateCount(requestedFlavor, count);
     				agent.add('Nice! I\'ve updated the count for ' + requestedFlavor + ' to ' + newcount + '. Enjoy your coffee!!');
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
    }
  
      function suggestFlavorNoHandler(agent) {
        let flavorsArrayCopy = agent.getContext('suggestion').parameters.flavorsArray;
        let flavorIndex = Math.floor(Math.random() * flavorsArrayCopy.length);
        let randomFlavor = flavorsArrayCopy[flavorIndex];
        
        //remove the new suggestion from the array to prevent repeats in this session
        if(flavorsArrayCopy.length > 2){
        	removeElement(flavorsArrayCopy, randomFlavor);
        }
        //capitalize flavor name for display
        let flavorName = capitalize(randomFlavor);
        //get the relevant info for this flavor
        let dialogflowAgentDoc = db.collection('nespresso').doc(randomFlavor);
		
        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I\'m all out of suggestions.');
                } else {
                    agent.add('<speak> How about ' + flavorName + '?  It\'s ' + doc.data().description + ',<break time ="500ms"/> has a strength of ' + doc.data().strength + ',<break time ="300ms"/> and we have ' + doc.data().count + ' on hand. Sound good?</speak>');
                    agent.setContext({
                        name: 'suggestion',
                        lifespan: 3,
                        parameters: {
                            flavor: randomFlavor,
                            flavorsArray: flavorsArrayCopy
                        }
                    });
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
      }

    function getFlavorHandler(agent) {
        const requestedFlavor = (agent.parameters.flavor).toLowerCase();
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);
        let flavorName = capitalize(requestedFlavor);
        if(flavorName == 'Livanto'){
           let flavorName =   '<say-as interpret-as="italian">Liv-AHNtoe</say-as>';
        }

        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('No data found in the database!');
                } else {
                    agent.add(flavorName + ' is ' + doc.data().description + '. It\'s strength is ' + doc.data().strength + ' and we have ' + doc.data().count + ' capsules left. Would you like to have this one?');
                    agent.setContext({
                        name: 'user-flavor',
                        lifespan: 2,
                        parameters: {
                            flavor: requestedFlavor
                        }
                    });
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
    }

    function getFlavorYesHandler(agent) {
        const requestedFlavor = agent.getContext('user-flavor').parameters.flavor;
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);

        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('No data found in the database!');
                } else {
                    const count = doc.data().count;
                    const newcount = count - 1;
                    updateCount(requestedFlavor, count);
                    agent.add('Nice! I\'ve updated the count for ' + requestedFlavor + ' to ' + newcount + '. Enjoy your coffee!!');
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
    }

    function addBoxHandler(agent) {
        const requestedFlavor = agent.parameters.flavor;
        const flavorName = capitalize(requestedFlavor);

        let numbBoxes = agent.parameters.number;
        if (numbBoxes === 'undefined' || numbBoxes === null || numbBoxes === '') {
            numbBoxes = 1;
        }
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);

        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I can\'t find this flavor info!');
                } else {
                    const count = doc.data().count;
                    const newcount = count + (numbBoxes * 10);
                    updateWithNewBoxes(requestedFlavor, newcount);
                    agent.add('Bravo! I\'ve updated the count for  ' + flavorName + ' to ' + newcount + '. Time for a coffee!!');
                }
                return Promise.resolve('Read complete');
            }).then(doc => {

                return Promise.resolve('Update count complete');
            }).catch(() => {
                agent.add('Oops something went wrong.');
            });
    }

    function updateCountHandler(agent, count) {
        const requestedFlavor = agent.parameters.flavor;
        const flavorName = capitalize(requestedFlavor);
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);

        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I can\'t find this flavor info!');
                } else {
                    const count = doc.data().count;
                    if (count === 0) {
                        agent.add('Sorry, we don\'t have any ' + flavorName + ' today. Would you like to order some?');
                    } else if (count === 1) {
                        agent.add('Okay, this is the last one. Should I order more?');
                        updateCount(requestedFlavor, count);
                    } else if (count <= 3) {
                        let newcount = count - 1;
                        updateCount(requestedFlavor, count);
                        agent.add('Okay, with just ' + newcount + 'left we\'re running low on ' + flavorName + ' . Should I order more?');
                    } else {
                        let newcount = count - 1;
                        updateCount(requestedFlavor, count);
                        agent.add('Nice! I\'ve updated the count for  ' + flavorName + ' to ' + newcount + '. Enjoy your coffee!');
                    }

                }
                return Promise.resolve('Read complete');
            }).then(doc => {
                // agent.add('Anything else you need?');
                return Promise.resolve('Update count complete');
            }).catch(() => {
                agent.add('Oops something went wrong.');
            });
    }

    function updateCount(requestedFlavor, count) {
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);
        const newCount = count - 1;
        const available = false;
        if (newCount === 0) {
            return db.runTransaction(t => {
                t.update(dialogflowAgentDoc, {
                    count: newCount,
                    inStock: available
                });
                return Promise.resolve('Write complete');
            });
        }
        return db.runTransaction(t => {
            t.update(dialogflowAgentDoc, {
                count: newCount
            });
            return Promise.resolve('Write complete');
        });
    }

    function updateWithNewBoxes(requestedFlavor, newcount) {
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);
        return db.runTransaction(t => {
            t.update(dialogflowAgentDoc, {
                count: newcount,
                inStock: true
            });
            return Promise.resolve('Write complete');
        });
    }

    function getCountHandler(agent) {
        const requestedFlavor = agent.parameters.flavor;
        const flavorName = capitalize(requestedFlavor);
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);

        return dialogflowAgentDoc.get()
            .then(doc => {
                let latestCount = doc.data().count;
                if (!doc.exists) {
                    agent.add('No data found in the database!');
                } else if (latestCount <= 3) {
                    agent.add('We only have ' + latestCount + ' left. Should I order more ' + flavorName + '?');
                } else {
                    agent.add('We have ' + latestCount + ' of ' + flavorName);
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
                agent.add('Please add a entry to the database first by saying, "Write <your phrase> to the database"');
            });
    }

    function getStrengthHandler(agent) {
        const requestedFlavor = agent.parameters.flavor;
        const flavorName = capitalize(requestedFlavor);
        const dialogflowAgentDoc = db.collection('nespresso').doc(requestedFlavor);
        return dialogflowAgentDoc.get()
            .then(doc => {
                if (!doc.exists) {
                    agent.add('Sorry, I can\'t find anything for that one.');
                } else {
                    agent.add(flavorName + ' is a solid ' + doc.data().strength);
                }
                return Promise.resolve('Read complete');
            }).catch(() => {
                agent.add('Error reading entry from the Firestore database.');
            });
    }

    let intentMap = new Map();
    intentMap.set('welcome_intent', welcomeHandler);
    intentMap.set('get_strength_intent', getStrengthHandler);
    intentMap.set('get_count_intent', getCountHandler);
    intentMap.set('get_flavor_intent', getFlavorHandler);
    intentMap.set('get_flavor_yes', getFlavorYesHandler);
    intentMap.set('suggest_flavor_intent', suggestFlavorHandler);
    intentMap.set('suggest_flavor_yes', suggestFlavorYesHandler);
    intentMap.set('suggest_flavor_no', suggestFlavorNoHandler);
    intentMap.set('add_box_intent', addBoxHandler);
    intentMap.set('update_count_intent', updateCountHandler);
    agent.handleRequest(intentMap);
});

// Helper Functions --------------------------------------------------------------------------------------------------------
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getInventory(db) {
  // [START get_inventory]
  let flavorsArr = [];
  const flavorsRef = db.collection('nespresso');
  let query = flavorsRef.where('inStock', '==', true).get()
    .then(snapshot => {
      if (snapshot.empty) {
        return console.log('No matching documents.');
      }  
      snapshot.forEach(doc => {
        flavorsArr.push(doc.data().id);
      });
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
  // [END get_inventory]

  return flavorsArr;
}
function removeElement(array, elem) {
    var index = array.indexOf(elem);
    if (index > -1) {
        array.splice(index, 1);
    }
  return flavorsArray;
}

