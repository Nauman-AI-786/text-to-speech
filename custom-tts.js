let synth = window.speechSynthesis;
let voiceSelect = document.getElementById('voiceSelect');
let rateRange = document.getElementById('rateRange');
let pitchRange = document.getElementById('pitchRange');
let voices = [];

// Browser se saari available aawazein (Urdu, Hindi, English etc.) nikalna
function populateVoiceList() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = '';
  
  voices.forEach((voice, i) => {
    let option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.setAttribute('data-lang', voice.lang);
    option.setAttribute('data-name', voice.name);
    
    // Urdu ya Hindi ko default select karne ke liye check
    if(voice.lang.includes('ur') || voice.lang.includes('hi')) {
        option.selected = true;
    }
    voiceSelect.appendChild(option);
  });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// Replit ke main play button ko is custom settings ke sath jorna
// Note: Ye code tab kaam karega jab aap ka text convert ho raha hoga
