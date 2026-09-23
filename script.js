const synth = window.speechSynthesis;

const textInput = document.getElementById('text-input');
const voiceSelect = document.getElementById('voice-select');
const rate = document.getElementById('rate');
const pitch = document.getElementById('pitch');
const speakBtn = document.getElementById('speak-btn');

let voices = [];

function populateVoiceList() {
    voices = synth.getVoices();

    voiceSelect.innerHTML = '';
    voices.forEach((voice, i) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;

        option.value = i;
        voiceSelect.appendChild(option);
    });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

function speak() {
    if (synth.speaking) {
        alert('Speech is already in progress.');
        return;
    }
    if (textInput.value.trim() === '') {
        alert('Please enter text to speak.');
        return;
    }

    const utterThis = new SpeechSynthesisUtterance(textInput.value);
    const selectedVoice = voices[voiceSelect.value];
    utterThis.voice = selectedVoice;
    utterThis.rate = rate.value;
    utterThis.pitch = pitch.value;

    synth.speak(utterThis);
}

speakBtn.addEventListener('click', speak);

