const promptform = document.querySelector(".prompt-form");
const container = document.querySelector(".container")
let promptInput = promptform.querySelector(".prompt-input");
const chatcontainer = document.querySelector(".chats-container");
const fileinput = document.querySelector("#file-input");
const fileuploadWrapper = promptform.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

//api setup
const API_key = "AIzaSyAxat2eXB8rJGfvSNC3nHZE3kBbF5_Aq1U";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_key}`;

let typingInterval,controller;

const chathistory = [];//we will store every bot and user message so the bot know the past conversation

const userData = { message: "", file: {} };//Before, you only had usermessage (plain text).it is a object


//function to craetemessage element
const creatMsgelement = (content, ...classes) => {//by using ...classes we can add multiple classes dynamically
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}
//scroll to the bottom of the conatiner
const scrolltobottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });



// stimulate typing effect for bot responses 
const typingeffect = (text, textelement, botMsgDiv) => {
  textelement.textContent = ""
  const words = text.split(" ");//Breaks the message (text) into an array of words, using spaces (" ") as separators.Example: "Hello World!" → ["Hello", "World!"]
  let wordIndex = 0;
  //set an interval to type each word This creates the "typing" effect by slowly adding words.
   typingInterval = setInterval(() => {
    //If we haven’t finished all words yet, add the next word.
    if (wordIndex < words.length) {
      textelement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      //(wordIndex === 0 ? "" : " ") → If it’s the first word, don’t add a space before it. Otherwise, add a space before new words.
      scrolltobottom();
    }
    else {
      //clearInterval(typingInterval) → Stops the typing loop (otherwise it would keep running forever).
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40)
}


// make an api call and generate a bot response
const generateResponse = async (botMsgDiv) => {
  const textelement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  // add user message to chat history
  chathistory.push({
    role: "user", // tell the api that the message was written by user

    // **new following will include the attached file data along with the message in the chat history,aligned with gemini required gemini
    parts: [{ text: userData.message }, ...(userData.file.data ? [{inline_data: (({fileName,isImage,...rest}) => rest)(userData.file)}] :[])]//Gemini expects messages to be wrapped in an array of “parts”, where each part contains text.

    // ... rest is used to destructing the object it will Pull out fileName and isImage from userData.file.

    // Put everything else that remains into a new object called rest. 


  });
  try {
    // send the chat history to the api and get a response
    const response = await fetch(API_URL, {
      method: "POST",//tells fetch we’re sending data
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_key
      },   // 👈 same as curl

      body: JSON.stringify({
        contents: chathistory //sends all the messages (user + model so far) so Gemini has context.
      }),
      signal:controller.signal
      //attaching the controller to terminate the fetch request
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingeffect(responseText, textelement, botMsgDiv);
    chathistory.push({
      role: "model",
      parts: [{ text: responseText }]
    });
    console.log(chathistory)

  }
  catch (error) {
    textelement.style.color = "#d62939"
    textelement.textContent = error.name === "AbortError"? "Response generation stopped.": error.message;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding")
    scrolltobottom();
  }
  finally{
    userData.file = {};
  }
}

//handle the form ssubmission
const handleformsubmit = (e) => {
  e.preventDefault();// which is reloading the page when you press submit
  const usermessage = promptInput.value.trim();// trim will remove extraspaces  from thge start and end
  
  if (!usermessage) return;// if the message is empty after the trimming don.t log anything
  // clearing the prompt input once the message was added hh


  promptInput.value = "";//After sending a message, the input box resets to empty — so it behaves like a real chat app where you don’t have to delete your previous text

  //adding the user message in the userdataobject
  userData.message = usermessage;
  // generate usermessage html and in the chats conatiner
  document.body.classList.add("bot-responding" , "chats-active");
  fileuploadWrapper.classList.remove("active", "img-attached", "file-attached");//hiding the file preview once the message has been sennt
  const userMsgHtml = `
  <p class="message-text"></p>
${
  userData.file.data
    ? (
        userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span></p>`
      )
    : 
    ""
}
`

  const userMsgDiv = creatMsgelement(userMsgHtml, "user-message")
  userMsgDiv.querySelector(".message-text").textContent = usermessage;//Finds the <p class="message-text"> inside that new div an insert the user typed message in the div
  chatcontainer.appendChild(userMsgDiv);
  scrolltobottom();
  setTimeout(() => {
    // generate bot meassage HTML and add in the chats container in 600ms
    const botMsgHtml = `<img src="gemini.png.svg" class="avatar"><p class="message-text">just a sec....</p>`
    const botMsgDiv = creatMsgelement(botMsgHtml, "bot-message", "loading");
    scrolltobottom();
    chatcontainer.appendChild(botMsgDiv);
    generateResponse(botMsgDiv);

  }, 600)
}

//handle file input change(file upload)
fileinput.addEventListener("change", () => {
  const file = fileinput.files[0];
  if (!file) return;
  //.files is a list (array-like) of chosen files.

  // [0] means we only take the first file.

  // If no file was selected (user cancels), return stops execution.
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileinput.value = "";
    //      Resets the input → so if the user picks the same file again, the change event will still fire.
    // Prevents confusion (keeps input clean).

    const base64string  = e.target.result.split(",")[1]
    fileuploadWrapper.querySelector(".file-preview").src = e.target.result//We set its src attribute to e.target.result.
    fileuploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    //store file data in user data object
    userData.file = {fileName: file.name ,
        data: base64string,
        mime_type: file.type , 
        isImage
      };
  }
})
//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileuploadWrapper.classList.remove("active", "img-attached", "file-attached");

})
//stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
 // new (correct)
chatcontainer.querySelector(".bot-message.loading")?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
  
})
//delete all chats
document.querySelector("#delete-chat-btn").addEventListener("click", () => {
  chathistory.length = 0;
  chatcontainer.innerHTML = "";
  document.body.classList.remove("bot-responding" , "chats-active");

})
//handle suggestion click
document.querySelectorAll(".suggestion-item").forEach(item => {
  item.addEventListener("click",() =>{
    promptInput.value = item.querySelector(".text").textContent;
    promptform.dispatchEvent(new Event("submit"));
  })
})

// changing  or toggling the theme
themeToggle.addEventListener("click",() =>{
  const isLightTheme  = document.body.classList.toggle("light-theme");
  localStorage.setItem("themecolor" ,isLightTheme ? "light_mode":"dark-mode")//storing the theme in localstorage so it does'nt change when reset
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
})
//set intial theme for local storage
const isLightTheme = localStorage.getItem("themecolor") === "light_mode";
document.body.classList.toggle("light-theme",isLightTheme)
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";


promptform.addEventListener("submit", handleformsubmit);

promptform.querySelector("#add-file-btn").addEventListener("click", () => fileinput.click());