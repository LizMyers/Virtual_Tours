const admin = require('./node_modules/firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");
const data = require("./data.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://virtual-tours-usycht.firebaseio.com"
});
const firestore = admin.firestore();
const settings = {timestampsInSnapshots: true};
firestore.settings(settings);
if (data && (typeof data === "object")) {
Object.keys(data).forEach(docKey => {
 firestore
 .collection("sites")
 .doc(docKey)
 .set(data[docKey])
 .then((res) => {
    console.log("Document " + docKey + " successfully written!");
}).catch((error) => {
   console.error("Error writing document: ", error);
});
});
}