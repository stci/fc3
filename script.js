const defaultLanguage = 'en-GB';

let storedCards = [];
let selectedBuiltInLessons = [];
let builtInData = {};
let cards = [];
let index = 0;

function getBestVoice(lang, callback) {
  const iOSBestVoice = {
    "de-de": "Anna",       // iPad preferred German
    "en-gb": "Daniel"      // iPad English GB
  };

  const preferred = {
    "de-de": ["katja", "conrad"], // MS Edge / other preferred DE voices
    "en-gb": ["daniel", "zira", "george"],
    "en-us": ["samantha", "jenny", "david"]
  };

  function loadVoices() {
    let voices = speechSynthesis.getVoices();

    // iOS may need polling
    if (!voices.length && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      let attempts = 0;
      const interval = setInterval(() => {
        voices = speechSynthesis.getVoices();
        attempts++;
        if (voices.length || attempts > 20) { // ~2 seconds max
          clearInterval(interval);
          selectVoice(voices);
        }
      }, 100);
    } else {
      selectVoice(voices);
    }
  }

  function selectVoice(voices) {
    if (!voices.length) return callback(null);

    const langPrefix = lang.toLowerCase();

    function isBadMultilingual(v) {
      const n = v.name.toLowerCase();
      return n.includes("multilingual") || n.includes("universal");
    }

    // --- iPad preferred voices ---
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const bestName = iOSBestVoice[langPrefix];
      if (bestName) {
        let voice = voices.find(v => v.name.toLowerCase().includes(bestName.toLowerCase()));
        if (voice) return callback(voice);
      }
    }

    // --- MS Edge preferred voices ---
    if (/Edg/.test(navigator.userAgent)) {
      let voice = voices.find(v =>
        v.name.toLowerCase().includes("online") &&
        v.name.toLowerCase().includes("natural") &&
        !isBadMultilingual(v) &&
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      if (voice) return callback(voice);
    }

    // --- Preferred voices by name ---
    let voice = voices.find(v =>
      v.lang.toLowerCase().startsWith(langPrefix) &&
      !isBadMultilingual(v) &&
      preferred[langPrefix] &&
      preferred[langPrefix].some(p => v.name.toLowerCase().includes(p))
    );
    if (voice) return callback(voice);

    // --- Other native voices (not multilingual) ---
    voice = voices.find(v =>
      v.lang.toLowerCase().startsWith(langPrefix) &&
      !isBadMultilingual(v)
    );
    if (voice) return callback(voice);

    // --- German fallbacks ---
    if (langPrefix === "de-de") {
      ["de-at", "de-ch"].some(fbLang => {
        voice = voices.find(v =>
          v.lang.toLowerCase() === fbLang && !isBadMultilingual(v)
        );
        return !!voice;
      });
      if (voice) return callback(voice);
    }

    // --- Last fallback: any matching language prefix ---
    voice = voices.find(v =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (voice) return callback(voice);

    // --- Nothing found ---
    callback(null);
  }

  if (speechSynthesis.getVoices().length > 0) {
    loadVoices();
  } else {
    speechSynthesis.addEventListener("voiceschanged", loadVoices, { once: true });
  }
}

const speak = (function () {
  let lastUsedData;

  return function (msg, language = defaultLanguage) {
    if (msg !== undefined) {
      lastUsedData = { msg: msg, lang: language };
    }
    if (!lastUsedData) return;

    if (!window.speechSynthesis) return;

    try {
      // stop any current speech
      window.speechSynthesis.cancel();

      // pick stable best voice
      getBestVoice(lastUsedData.lang, function (voice) {
        const utter = new SpeechSynthesisUtterance(lastUsedData.msg);
        utter.lang = lastUsedData.lang;

        if (voice) utter.voice = voice;

		//console.log(utter);
        speechSynthesis.speak(utter);
      });

    } catch (e) {
      console.error(e);
    }
  };
})();

// SHOW / HIDE card elements ---------------------------------------------------
function showQuestion() {
  document.getElementById("question").classList.toggle("hidden", false);
}

function hideQuestion() {
  document.getElementById("question").classList.toggle("hidden", true);
}

function showAnswer() {
  document.getElementById("answer").classList.toggle("hidden", false);
}

function hideAnswer() {
  document.getElementById("answer").classList.toggle("hidden", true);
}

function showRateButtons() {
  document.getElementById("rate").classList.toggle("hidden", false);
}

function hideRateButtons() {
  document.getElementById("rate").classList.toggle("hidden", true);
}

function showRevealButton() {
  document.getElementById("btn-reveal").classList.toggle("hidden", false);
}

function hideRevealButton() {
  document.getElementById("btn-reveal").classList.toggle("hidden", true);
}

function showSpeakButton() {
  document.getElementById("btn-play-audio").classList.toggle("hidden", false);
}

function hideSpeakButton() {
  document.getElementById("btn-play-audio").classList.toggle("hidden", true);
}

function showHelp() {
  document.getElementById("window-help").classList.toggle("hidden", false);
}

function hideHelp() {
  document.getElementById("window-help").classList.toggle("hidden", true);
}
// -----------------------------------------------------------------------------

// load data from storage ------------------------------------------------------
function loadCards() {
  const cards = JSON.parse(localStorage.getItem("flashcards")) || [];
  const cleaned = cards.filter(card => card !== null);
  return cards;
}

// save data to storage
function storeCards(cards) {
  const cleaned = cards.filter(card => card !== null);
  localStorage.setItem("flashcards", JSON.stringify(cleaned));
}

function convertRawDataFormat(rawText) {
  return rawText
    .split("\n")
    .map(line => {
      const trimmed = line.trim();

      // prázdny riadok necháme tak
      if (trimmed === "") return line;

      // sekčné nadpisy necháme tak
      if (trimmed.startsWith("===")) return line;

      // ak je tam "=" tak nerobíme nič
      if (trimmed.includes("=")) return line;

      // ak je tam ";" nahradíme ju za " = "
      if (trimmed.includes(";")) {
        return line.replace(";", " = ");
      }

      // inak vraciame nezmenené
      return line;
    })
    .join("\n");
}

// load data from storage
function loadUserRaw() {
  const rawdata = convertRawDataFormat(localStorage.getItem("rawdata")) || `=== Pozdravy
ahoj = hello
dobré ráno = good *morning*
dobrý večer = good *evening*
dobrý deň [doobeda] = good morning
dobrý deň [poobede] = good evening [from noon]

=== Rodina
rodina = family
mama = mother
otec = father`;

  const rawdataV2 = convertRawDataFormat(rawdata);
  if (rawdataV2 !== rawdata) {
	storeUserRaw(rawdataV2);
  }

  return rawdataV2;
}

// save data to storage
function storeUserRaw(rawdata) {
  localStorage.setItem("rawdata", rawdata);
}

function loadIncludedBuiltinLessons() {
  const data = JSON.parse(localStorage.getItem("builtin-lessons")) || [];
  return data;
}

function storeIncludedBuiltinLessons(data) {
  localStorage.setItem("builtin-lessons", JSON.stringify(data));
}
// -----------------------------------------------------------------------------

function setCardColor(rating) {
  const cardColor =
    rating == null
      ? "grey"
      : rating <= 34
      ? "red"
      : rating >= 65
      ? "green"
      : "orange";

  ["card-hru", "card-hrb"].forEach(id => {
    const el = document.getElementById(id);
    el.style.backgroundColor = cardColor;
    el.style.borderColor = cardColor;
  });
}

// 🃏 Zobrazenie kartičky
function showCard() {
  const q = document.getElementById("question");
  const note = document.getElementById("note");

  if (!cards.length) {
	selectLessons();
    return;
  }
  
  const card = cards[index];

  // zakladne udaje o karte
  document.getElementById("section").innerText = card.section;
  document.getElementById("card-number").innerText = "#" + card.metadata.cardID;
  setCardColor(card.metadata.lastRating);

  // text otazky
  const questionHTML = card.question.replace(/\*(.+?)\*/g, '<span class="bolder">$1</span>');
  q.innerHTML = questionHTML;
  note.innerHTML = card.qnote || '&nbsp;';

  // schovat a zobrazit jednotlive elementy
  hideAnswer();
  hideRateButtons();
  hideSpeakButton();
  showQuestion();
  showRevealButton();
  
  updateBar();
}

function updateBar() {
  const counts = cards.reduce((cnts, item) => {
    const key = item.metadata.lastRating;
    cnts[key] = (cnts[key] || 0) + 1;
    return cnts;
  }, {});

  // 2. Convert to percentages
  const total = cards.length;

  const percentages = Object.fromEntries(
    Object.entries(counts).map(([key, count]) => [
      key,
      (count / total * 100).toFixed(2) + '%'
    ])
  );
  
  [null, 0, 50, 100].forEach(key => {
    percentages[key] = percentages[key] ?? "0%";
  });
  
  Object.entries(percentages).forEach(([key, value]) => {
    const selector = `.rating-${key === 'null' ? 'null' : key}`;
    const el = document.querySelector(selector);
    if (el) el.style.width = value;
  });

}

// 💬 Zobraziť odpoveď
function revealAnswer() {
  const a = document.getElementById("answer");
  const note = document.getElementById("note");

  const card = cards[index];
  
  // text odpovede
  const answerHTML = card.answer.replace(/\*(.+?)\*/g, "<b>$1</b>");
  a.innerHTML = answerHTML;
  note.innerHTML = card.anote || '&nbsp;';

  // schovat a zobrazit jednotlive elementy
  hideRevealButton();
  hideQuestion();
  showAnswer();
  showRateButtons();
  showSpeakButton();
  
  // remove special characters (not to be read)
  const answerSpeak = card.answer.replace(/[*=;/\\]/g, "");
  speak(answerSpeak, card.lang);
}

function updateRating(rating) {
  //const card = cards[index];
  const card = cards.shift();
  const newScore = Math.round(100 * (card.metadata.score + 2 * rating) / 3) / 100;

  card.metadata.lastRating = rating;
  card.metadata.score = newScore;

  storedCards[card.metadata.cardID] = card;
  storeCards(storedCards);
  //localStorage.setItem("flashcards", JSON.stringify(storedCards));
  
  // Find correct index to re-insert
  let insertIndex = cards.findIndex(c => {
    return c.metadata.score > card.metadata.score; // score descending
  });

  if (insertIndex === -1) {
    // If no smaller element found, push to the end
    insertIndex = cards.length;
  }

  // Ensure insertIndex is at least 10, but not beyond array length
  insertIndex = Math.max(insertIndex, 3);
  insertIndex = Math.min(insertIndex, cards.length);

  cards.splice(insertIndex, 0, card);
  
  showCard();
  //nextCard();
}

// Navigácia
function nextCard() {
  if (!cards.length) return;
  index = (index + 1) % cards.length;
  showCard();
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function parseLineLesson(str, defaultLang = defaultLanguage) {
  //const regex = /^===\s*(.*?)\s*(?:\[(.*?)\])?$/;
  const regex = /^===\s*(.*?)\s*(?:#(.*?)#)?\s*(?:\[(.*?)\])?$/;
  const match = str.match(regex);

  if (!match) {
    throw new Error("Invalid format");
  }

  const lesson = match[1].trim();
  const language = match[2] ? match[2].trim() : defaultLang;
  const note = match[3] ? match[3].trim() : '';

  return { lesson, language, note };
};

// parse TEXT DATA
function parseData(rawdata) {
  dbLog = document.getElementById("database-log");
  dbLog.innerHTML = '';

  const lines = rawdata.split("\n");
  const newLessons = [];
  const newCards = [];
  let currentLesson = "";

  const htmlTagPattern = /<\/?[a-z][\s\S]*?>/i;
  //const pattern = /^(=== .+|([^;\[\]]+(\[.*?\])?)=([^;\[\]]+(\[.*?\])?))$/;
  const pattern = /^(=== .+|[^=\[]+(?: \[[^\]]+\])?\s*=\s*[^=\[]+(?: \[[^\]]+\])?)$/;
  
  lines.forEach((line, lineIDX) => {
    if (!line.trim()) return;
	line = line.replace(/\r$/, "");
    if (htmlTagPattern.test(line)) {
      dbLog.innerHTML += `Riadok ${lineIDX + 1}: ${escapeHTML(line)}<br /><i>Nesprávny formát riadku.</i><br />`;
	  return;
    };
    if (!pattern.test(line)) {
		dbLog.innerHTML += `Riadok ${lineIDX + 1}: ${escapeHTML(line)}<br /><i>Nesprávny formát riadku.</i><br />`;
		return;
    }
	
    if (line.startsWith("===")) {
	  currentLesson = parseLineLesson(line);
	  newLessons.push(currentLesson);
    } else {
      const [qraw, araw] = line.split("=").map(x => x.trim());
	  let match = qraw.match(/\[(.*?)\]/);
	  const qnote = match ? `(${match[1]})` : "";
	  const q = qraw.replace(/\[.*?\]/, '').trim();
	  
	  match = araw.match(/\[(.*?)\]/);
	  const anote = match ? `(${match[1]})` : "";
	  const a = araw.replace(/\[.*?\]/, '').trim();
	  
	  const found = storedCards.find(item =>
		item.section === currentLesson.lesson &&
		item.question === q &&
		item.answer === a
	  );

      const meta = {
		cardID: newCards.length,
		lastRating: found?.metadata?.lastRating ?? null,
		score: found?.metadata?.score ?? (1) // default score = 1
	  };
      newCards.push({ section: currentLesson.lesson, lang: currentLesson.language, question: q, answer: a, qnote: qnote, anote: anote, metadata: meta });
    }
  });

  if (dbLog.innerText === '') {
	return {lessons: newLessons, cards: newCards};
  } else {
	showHelp();
	return null;
  };

}

// 🧩 Načítanie databázy z textarea
function loadUserData() {
  const raw = document.getElementById("rawData").value;
  const newData = parseData(raw);
  
  if (newData !=  null) {
	// if OK => store data
    newData.cards.forEach(card => {
	  card.metadata.builtin = false;
	});
	storeUserRaw(raw);
    //storedCards = storedCards.filter(card => !card.metadata.builtin);
	storedCards = storedCards.filter(card => card.metadata?.builtin === true);
    storedCards.push(...newData.cards);
    storeCards(storedCards);

	//storedCards = newData.cards;
	//storeCards(storedCards);
	
    showLessons();
	hideHelp();
  }

}

function loadBuiltInLessonsFile(file) {
  return fetch(file)
    .then(r => r.text())
    .then(data => {
      const newData = parseData(data);
      newData.cards.forEach(card => card.metadata.builtin = true);
      return newData;
    });
}

function loadBuiltInLessons() {
  // Step 1: load files.txt
  return fetch("../fc3/data/files.txt")
    .then(response => {
      if (!response.ok) throw new Error("Failed to load files.txt");
      return response.text();
    })
    .then(text => {
      // Split lines and remove empty lines / trim whitespace
      const files = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Step 2: load all listed files
      return Promise.all(files.map(f => loadBuiltInLessonsFile(f)));
    })
    .then(results => {
      // Step 3: merge all results
      const merged = { lessons: [], cards: [] };
      results.forEach(res => {
        merged.lessons.push(...res.lessons);
        merged.cards.push(...res.cards);
      });
      return merged;
    });
}

// 🧭 Prepínanie okien
function showWindow(id) {
  // skryje všetky okná vrátane sekcie s kartičkami
  document.querySelectorAll(".window, #window-cards").forEach(w => w.classList.add("hidden"));

  // zobrazí požadované okno
  const win = document.getElementById(id);
  if (win) win.classList.remove("hidden");
}

function manageDB() {
  showWindow("window-database");
  const selected = loadIncludedBuiltinLessons();
  if (selected.length > 0) {
	document.getElementById("btn-manage-builtin-db").classList.remove("glowing");
	document.getElementById("db-included-builtin-head").innerText = "Použité vstavané lekcie:";
	document.getElementById("included-builtin-lessons").innerText =
      selected.map(item => `• ${item}`).join("\n");
  } else {
	document.getElementById("db-included-builtin-head").innerText = "Nie sú použité žiadne vstavané lekcie.";
	document.getElementById("included-builtin-lessons").innerText = "";
	document.getElementById("btn-manage-builtin-db").classList.add("glowing");
  };
}

function manageBuiltInDB() {
  loadBuiltInLessons().then(data => {
	builtInData = data;
    const listElement = document.getElementById("builtin-check-list");
    showBuiltInLessons(builtInData, listElement);
	const includedLessons = loadIncludedBuiltinLessons();
	document.querySelectorAll("#builtin-check-list input[type=checkbox]")
      .forEach(ch => {
      ch.checked = includedLessons.includes(ch.value);
    });
	//showBuiltInLessons
  });
  
  showWindow("window-builtin");
}

function actualizeBuiltinDB() {
  loadBuiltInLessons().then(data => {
	const includedLessons = loadIncludedBuiltinLessons();
    const cardsToInclude = data.cards.filter(item => includedLessons.includes(item.section)); 
    storedCards = storedCards.filter(card => !card.metadata.builtin);
    storedCards.push(...cardsToInclude);
    storeCards(storedCards);
  });
}

function includeBuiltInData() {
  const selected = Array.from(document.querySelectorAll('#builtin-check-list input[type=checkbox]:checked')).map(ch => ch.value);
  const cardsToInclude = builtInData.cards.filter(item => selected.includes(item.section)); 
  storedCards = storedCards.filter(card => !card.metadata.builtin);
  storedCards.push(...cardsToInclude);
  storeIncludedBuiltinLessons(selected);
  storeCards(storedCards);
  //document.getElementById("included-builtin-lessons").innerText = selected.join("\n");
  manageDB();
}

/*
function selectLessonsWindow() {
  if (storedCards.length === 0) {
	  loadData();
	  return;
  };
  
  showLessons();
  showWindow("window-sections");
}
*/

function startTraining() {
  const selected = Array.from(document.querySelectorAll('#lessons-check-list input[type=checkbox]:checked')).map(ch => ch.value);
  const filteredCards = storedCards.filter(item => selected.includes(item.section));
 
  cards = [...filteredCards].sort(
    (a, b) => (a.metadata.score - b.metadata.score) || (Math.random() - 0.5)
  );
  index = 0;
  showWindow("window-cards");
  showCard();
}

// 📘 Výber vstavaných lekcií
function showBuiltInLessons(data, ulElement) {
  if (data === null | data === {}) {
	  return;
  };
  
  ulElement.innerHTML = "";
  data.lessons.forEach(lesson => {
	var cnt = data.cards.filter(card => card.section === lesson.lesson).length;
    const li = document.createElement("li");
	var cntHTML = `<span style="font-style: italic; color: #D3D3D3;">(${cnt})</span>`;
	var noteHTML = (lesson.note) !== '' ? `<span style="font-style: italic; color: DodgerBlue;">- ${lesson.note}</span>` : '';
	var labelHTML = `<label for="${lesson.lesson}"> ${lesson.lesson} ${cntHTML} ${noteHTML}</label>`;
	li.innerHTML = `<input type="checkbox" name="${lesson.lesson}" value="${lesson.lesson}">${labelHTML}`;
    ulElement.appendChild(li);
  });
}

// 📘 Výber lekcií
function showLessons() {
  if (storedCards.length === 0) {
	  loadUserData();
  };
  if (storedCards.length === 0) {
	  manageDB();
	  return;
  };
  
  const list = document.getElementById("lessons-check-list");
  list.innerHTML = "";
  //const sections = [...new Set(storedCards.map(c => c.section))];
  const sections = [
    ...new Set(
      storedCards
        .filter(c => c && !c.metadata?.builtin)  // filter cards based on attribute
        .map(c => c.section)    // extract section
    )
  ];
  sections.forEach(section => {
	var cnt = storedCards.filter(item => item && item.section === section).length;
    const li = document.createElement("li");
	li.innerHTML = `<input type="checkbox" name="${section}" value="${section}" checked><label for="${section}">${section} <span style="font-style: italic; color: #D3D3D3;">(${cnt})</span></label>`;
    list.appendChild(li);
  });

  // pridat vstavane lekcie
  const Bsections = [
    ...new Set(
      storedCards
        .filter(c => c && c.metadata.builtin == true)  // filter cards based on attribute
        .map(c => c.section)    // extract section
    )
  ];
  if (Bsections.length > 0) {
  const lixx = document.createElement("li");
  lixx.innerHTML = `<p id="builtin-lessons-note">Vstavané lekcie</p><hr />`;
  list.appendChild(lixx);
  Bsections.forEach(section => {
	var cnt = storedCards.filter(item => item && item.section === section).length;
    const lix = document.createElement("li");
	lix.innerHTML = `<input type="checkbox" name="${section}" value="${section}" checked><label for="${section}">${section} <span style="font-style: italic; color: #D3D3D3;">(${cnt})</span></label>`;
    list.appendChild(lix);
  });
  };
  
  showWindow("window-sections");
}

function selectAllLessons() {
  document.querySelectorAll("#lessons-check-list input").forEach(ch => (ch.checked = true));
}

function selectNoneLesson() {
  document.querySelectorAll("#lessons-check-list input").forEach(ch => (ch.checked = false));
}

// 🧭 Inicializácia
function init() {
  //document.getElementById("rawData").value = localStorage.getItem("rawdata") || `=== Pozdravy
  document.getElementById("rawData").value = loadUserRaw();

  // Pridanie listenerov
  document.getElementById("btn-manage-db").addEventListener("click", manageDB);
  document.getElementById("btn-manage-builtin-db").addEventListener("click", manageBuiltInDB);
  document.getElementById("btn-use-builtin").addEventListener("click", includeBuiltInData);
  document.getElementById("btn-select-lessons").addEventListener("click", showLessons);
  document.getElementById("btn-load-db").addEventListener("click", loadUserData);
  document.getElementById("btn-select-all").addEventListener("click", selectAllLessons);
  document.getElementById("btn-select-none").addEventListener("click", selectNoneLesson);
  document.getElementById("btn-start-training").addEventListener("click", startTraining);
  document.getElementById("btn-reveal").addEventListener("click", revealAnswer);
  document.getElementById("btn-play-audio").addEventListener("click", speak.bind(null, undefined, undefined));
  //document.getElementById("btn-help").addEventListener("click", showHelp);

  document.querySelectorAll(".rating button").forEach(btn =>
    btn.addEventListener("click", () => updateRating(parseInt(btn.dataset.rating)))
  );

  storedCards = loadCards();
  actualizeBuiltinDB();
  
  showLessons();
  // Po načítaní rovno začni tréning
  if (storedCards.length > 0) {
    startTraining();
  } else {
    manageDB(); // ak nie sú dáta, otvor databázu
  }
}

window.addEventListener("load", init);




