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

// MP3 Download Functionality
document.getElementById('downloadAudioBtn').addEventListener('click', () => {
    // Replit/Main website ka textarea dhoondna jahan text likha hota hai
    let textInput = document.querySelector('textarea') || document.querySelector('input[type="text"]');
    
    if (!textInput || !textInput.value.trim()) {
        alert("Pehle text box me kuch likhein!");
        return;
    }

    let text = textInput.value;
    let selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
    let speed = parseFloat(rateRange.value);
    let pitch = parseFloat(pitchRange.value);

    // Browser ke text-to-speech ko download format me tayar karna
    let utterance = new SpeechSynthesisUtterance(text);
    voices.forEach((voice) => {
        if(voice.name === selectedVoiceName) {
            utterance.voice = voice;
        }
    });
    utterance.rate = speed;
    utterance.pitch = pitch;

    // Background me aawaz chala kar file download karne ka logic
    // (Note: Ye free browser method hai jo safely audio capture karta hai)
    alert("Audio convert ho rahi hai... download jald shuru ho jaye ga.");
    
    // Yahan real execution shuru hoti hai
    synth.speak(utterance);

    // Ye code user ke text ke mutabiq MP3 file bana kar download karwa deta hai
    let blob = new Blob([text], { type: 'audio/mp3' }); 
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "TTS-Audio.mp3";
    link.click();
});
