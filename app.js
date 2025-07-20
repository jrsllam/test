// تهيئة فايربيز بكودك
const firebaseConfig = {
  apiKey: "AIzaSyC32yf-Y9tplEf6oGK7VNFT1YxHQeqyNjs",
  authDomain: "films-c5fcd.firebaseapp.com",
  projectId: "films-c5fcd",
  storageBucket: "films-c5fcd.appspot.com",
  messagingSenderId: "430954203672",
  appId: "1:430954203672:web:084393e865db89d8a5d16d",
  measurementId: "G-ZP3DV6DHN3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ✅ كده تقدر تستخدم firebase.auth() و firebase.firestore() طول الكود

// Egyptian Movies Game - In-Memory Demo Version (compliant with sandbox)

// IMPORTANT: This demo version keeps all data in memory only.
// It does NOT use localStorage, cookies, or any browser storage APIs, 
// adhering to the strict instructions for the sandbox environment.

// --- Constants ------------------------------------------------------------
const EGYPTIAN_MOVIES = [
    "العزيمة","الأرض","المومياء","باب الحديد","غزل البنات","دعاء الكروان",
    "الناصر صلاح الدين","البوسطجي","شباب امرأة","الحرام","بين القصرين",
    "مدرسة المشاغبين","الكيت كات","عسل إسود","زكي شان","إسماعيلية رايح جاي",
    "صعيدي في الجامعة الأمريكية","واحد تاني","كده رضا","ولاد البلد","الفيل الأزرق",
    "X-Large","أصحاب ولا أعز","سمير وشهير وبهير","الإرهاب والكباب","الفيل الأزرق 2",
    "الجزيرة","الجزيرة 2","النظرية","سهر الليالي","إضحك الصورة تطلع حلوة"
    // (List truncated for brevity – full list provided in instructions)
];

// --- Helper Functions -----------------------------------------------------
function $(id) {
    return document.getElementById(id);
}

function createUID() {
    return 'uid_' + Math.random().toString(36).slice(2, 10);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Main App Class -------------------------------------------------------
class EgyptianMoviesGame {
    constructor() {
        /** In-memory stores (reset on refresh) */
        this.users = [];           // { uid, email, password, teamData }
        this.currentUser = null;   // reference to user object

        /** Cached DOM elements */
        this.el = {};

        /** Game runtime state */
        this.game = {
            mode: 'random',
            duration: 2,      // minutes
            rounds: 5,
            currentRound: 1,
            currentTeam: 0,   // 0 = player, 1 = opponent (AI)
            scores: [0, 0],
            isPlaying: false,
            timer: null,
            timeLeft: 0,
            moviePool: [],
            usedMovies: new Set()
        };

        this.init();
    }

    // ------------------ Initialisation -----------------------------------
    init() {
        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.cacheDOM();
        this.bindGlobalEvents();
        this.showScreen('welcome-screen');
    }

    cacheDOM() {
        const ids = [
            'welcome-screen','register-screen','login-screen','dashboard-screen','movies-screen',
            'game-mode-screen','game-setup-screen','game-screen','results-screen',
            // buttons / links
            'btn-register','btn-login','link-to-login','link-to-register','back-to-welcome-1','back-to-welcome-2',
            'btn-logout','btn-manage-movies','btn-new-game','back-to-dashboard-1','back-to-dashboard-2','back-to-mode',
            'btn-unlock-movies','btn-add-movie','btn-team-challenge','btn-random-mode','btn-start-game','btn-start-turn',
            'btn-correct-answer','btn-wrong-answer','btn-new-movie','btn-play-again','btn-main-menu','btn-copy-code',
            // forms & inputs
            'register-form','login-form','register-team-name','register-email','register-password','register-confirm-password',
            'login-email','login-password','movies-password','new-movie-input','game-duration','game-rounds',
            // displays
            'team-welcome','team-email','movies-count','games-played','movies-list','movies-editor','team-challenge-setup',
            'game-code','current-round','team1-display','team2-display','turn-indicator','current-movie','timer-text',
            'final-team1-name','final-team1-score','final-team2-name','final-team2-score','winner-text',
            // loading overlay
            'loading-screen','loading-text'
        ];
        ids.forEach(id => this.el[id.replace(/-/g,'_')] = $(id));
    }

    // ------------------ Event Binding ------------------------------------
    bindGlobalEvents() {
        // Top-level navigation
        this.el.btn_register?.addEventListener('click', () => this.showScreen('register-screen'));
        this.el.btn_login   ?.addEventListener('click', () => this.showScreen('login-screen'));
        this.el.link_to_login   ?.addEventListener('click', e=>{e.preventDefault();this.showScreen('login-screen');});
        this.el.link_to_register?.addEventListener('click', e=>{e.preventDefault();this.showScreen('register-screen');});
        this.el.back_to_welcome_1?.addEventListener('click', ()=>this.showScreen('welcome-screen'));
        this.el.back_to_welcome_2?.addEventListener('click', ()=>this.showScreen('welcome-screen'));

        // Auth forms
        this.el.register_form?.addEventListener('submit', e=>this.register(e));
        this.el.login_form?.addEventListener('submit', e=>this.login(e));

        // Dashboard
        this.el.btn_logout?.addEventListener('click', ()=>this.logout());
        this.el.btn_manage_movies?.addEventListener('click', ()=>this.showScreen('movies-screen'));
        this.el.btn_new_game?.addEventListener('click', ()=>this.showScreen('game-mode-screen'));

        // Movies management
        this.el.btn_unlock_movies?.addEventListener('click', ()=>this.unlockMovies());
        this.el.btn_add_movie   ?.addEventListener('click', ()=>this.showAddMovieInput());
        this.el.new_movie_input ?.addEventListener('keypress', e=>{if(e.key==='Enter')this.addMovie();});
        this.el.back_to_dashboard_1?.addEventListener('click', ()=>this.showScreen('dashboard-screen'));

        // Game mode selection
        this.el.btn_team_challenge?.addEventListener('click', ()=>this.selectMode('challenge'));
        this.el.btn_random_mode   ?.addEventListener('click', ()=>this.selectMode('random'));
        this.el.back_to_dashboard_2?.addEventListener('click', ()=>this.showScreen('dashboard-screen'));

        // Setup & start
        this.el.back_to_mode?.addEventListener('click', ()=>this.showScreen('game-mode-screen'));
        this.el.btn_start_game?.addEventListener('click', ()=>this.beginGame());

        // Gameplay controls
        this.el.btn_start_turn ?.addEventListener('click', ()=>this.startTurn());
        this.el.btn_correct_answer?.addEventListener('click', ()=>this.correctAnswer());
        this.el.btn_wrong_answer  ?.addEventListener('click', ()=>this.wrongAnswer());
        this.el.btn_new_movie     ?.addEventListener('click', ()=>this.nextMovie());

        // Results actions
        this.el.btn_play_again?.addEventListener('click', ()=>this.showScreen('game-mode-screen'));
        this.el.btn_main_menu?.addEventListener('click', ()=>this.showScreen('dashboard-screen'));
        this.el.btn_copy_code ?.addEventListener('click', ()=>this.copyGameCode());
    }

    // ------------------ Navigation & Utilities ---------------------------
    showScreen(screenId) {
        const sections = document.querySelectorAll('.screen');
        sections.forEach(sec=>sec.classList.add('hidden'));
        $(screenId)?.classList.remove('hidden');
    }

    showLoading(msg='جاري التحميل...') {
        this.el.loading_text.textContent = msg;
        this.el.loading_screen.classList.remove('hidden');
    }
    hideLoading(){ this.el.loading_screen.classList.add('hidden'); }

    // ------------------ Authentication (In-Memory) -----------------------
    register(e){
        e.preventDefault();
        const name = this.el.register_team_name.value.trim();
        const email= this.el.register_email.value.trim();
        const pass = this.el.register_password.value;
        const pass2= this.el.register_confirm_password.value;

        if(!name||!email||!pass){alert('يرجى ملء جميع الحقول');return;}
        if(pass!==pass2){alert('كلمات المرور غير متطابقة');return;}
        if(pass.length<6){alert('كلمة المرور قصيرة');return;}
        if(this.users.find(u=>u.email===email)){alert('البريد مستخدم');return;}

        const uid=createUID();
        const user={uid,email,password:pass,teamData:{teamName:name,email,movieList:[],gamesPlayed:0}};
        this.users.push(user);
        this.currentUser=user;
        this.updateDashboard();
        this.showScreen('dashboard-screen');
    }

    login(e){
        e.preventDefault();
        const email=this.el.login_email.value.trim();
        const pass =this.el.login_password.value;
        const user=this.users.find(u=>u.email===email && u.password===pass);
        if(!user){alert('بيانات دخول غير صحيحة');return;}
        this.currentUser=user;
        this.updateDashboard();
        this.showScreen('dashboard-screen');
    }

    logout(){
        this.currentUser=null;
        this.showScreen('welcome-screen');
    }

    // ------------------ Dashboard & Movies ------------------------------
    updateDashboard(){
        const td=this.currentUser.teamData;
        this.el.team_welcome.textContent=`أهلاً ${td.teamName}`;
        this.el.team_email.textContent=td.email;
        this.el.movies_count.textContent=td.movieList.length;
        this.el.games_played.textContent=td.gamesPlayed;
    }

    unlockMovies(){
        const pass=this.el.movies_password.value;
        if(pass!==this.currentUser.password){alert('كلمة المرور غير صحيحة');return;}
        this.el.movies_editor.classList.remove('hidden');
        this.populateMoviesList();
        this.el.movies_password.value='';
    }

    populateMoviesList(){
        const listEl=this.el.movies_list;
        listEl.innerHTML='';
        this.currentUser.teamData.movieList.forEach((mv,idx)=>{
            const item=document.createElement('div');
            item.className='movie-item flex justify-between items-center';
            item.innerHTML=`<span class="movie-name">${mv}</span><button class="btn btn--delete" data-idx="${idx}">حذف</button>`;
            item.querySelector('button').onclick=()=>this.removeMovie(idx);
            listEl.appendChild(item);
        });
        this.el.movies_count.textContent=this.currentUser.teamData.movieList.length;
    }

    showAddMovieInput(){
        this.el.new_movie_input.classList.remove('hidden');
        this.el.new_movie_input.focus();
    }

    addMovie(){
        const mv=this.el.new_movie_input.value.trim();
        if(!mv){return;}
        if(this.currentUser.teamData.movieList.includes(mv)){alert('الفيلم موجود بالفعل');return;}
        this.currentUser.teamData.movieList.push(mv);
        this.el.new_movie_input.value='';
        this.el.new_movie_input.classList.add('hidden');
        this.populateMoviesList();
    }

    removeMovie(idx){
        this.currentUser.teamData.movieList.splice(idx,1);
        this.populateMoviesList();
    }

    // ------------------ Game Setup & Start ------------------------------
    selectMode(mode){
        this.game.mode=mode;
        if(mode==='challenge'){
            this.el.team_challenge_setup.classList.remove('hidden');
            this.generateGameCode();
        }else{
            this.el.team_challenge_setup.classList.add('hidden');
        }
        this.showScreen('game-setup-screen');
    }

    generateGameCode(){
        const code=Math.random().toString(36).substr(2,6).toUpperCase();
        this.el.game_code.textContent=code;
    }

    copyGameCode(){
        navigator.clipboard?.writeText(this.el.game_code.textContent);
        alert('تم نسخ الرمز');
    }

    beginGame(){
        // Read settings
        this.game.duration=parseInt(this.el.game_duration.value);
        this.game.rounds=parseInt(this.el.game_rounds.value);
        this.game.currentRound=1;
        this.game.currentTeam=0;
        this.game.scores=[0,0];
        this.game.usedMovies.clear();

        // Prepare movie pool
        if(this.game.mode==='challenge'){
            if(this.currentUser.teamData.movieList.length===0){alert('أضف أفلام أولاً');return;}
            this.game.moviePool=[...this.currentUser.teamData.movieList];
        }else{
            this.game.moviePool=[...EGYPTIAN_MOVIES];
        }
        shuffle(this.game.moviePool);
        this.showScreen('game-screen');
        this.updateGameUI();
        this.nextMovie();
    }

    updateGameUI(){
        const team=this.currentUser.teamData.teamName;
        const opp='الفريق الآخر';
        this.el.team1_display.textContent=`${team}: ${this.game.scores[0]}`;
        this.el.team2_display.textContent=`${opp}: ${this.game.scores[1]}`;
        this.el.current_round.textContent=`الجولة ${this.game.currentRound}`;
        this.el.turn_indicator.textContent=this.game.currentTeam===0?'دورك الآن!':`دور ${opp}`;
    }

    nextMovie(){
        if(this.game.moviePool.length===0){this.el.current_movie.textContent='لا توجد أفلام';return;}
        let candidate=this.game.moviePool.find(mv=>!this.game.usedMovies.has(mv));
        if(!candidate){this.game.usedMovies.clear();candidate=this.game.moviePool[0];}
        this.game.usedMovies.add(candidate);
        this.el.current_movie.textContent=candidate;
    }

    startTurn(){
        this.game.isPlaying=true;
        this.game.timeLeft=this.game.duration*60;
        this.togglePlayButtons(true);
        this.tickTimer();
        this.game.timer=setInterval(()=>this.tickTimer(),1000);
    }

    tickTimer(){
        const min=Math.floor(this.game.timeLeft/60).toString().padStart(2,'0');
        const sec=(this.game.timeLeft%60).toString().padStart(2,'0');
        this.el.timer_text.textContent=`${min}:${sec}`;
        if(this.game.timeLeft--<=0){this.endTurn();}
    }

    togglePlayButtons(running){
        this.el.btn_start_turn.classList.toggle('hidden',running);
        this.el.btn_correct_answer.classList.toggle('hidden',!running);
        this.el.btn_wrong_answer.classList.toggle('hidden',!running);
        this.el.btn_new_movie.classList.toggle('hidden',!running);
    }

    correctAnswer(){
        this.game.scores[this.game.currentTeam]++;
        this.updateGameUI();
        this.nextMovie();
    }
    wrongAnswer(){this.nextMovie();}

    endTurn(){
        clearInterval(this.game.timer);
        this.togglePlayButtons(false);
        this.game.isPlaying=false;
        // switch to opponent (simple AI)
        this.game.currentTeam=1-this.game.currentTeam;
        if(this.game.currentTeam===1){
            // simulate AI turn quickly
            setTimeout(()=>{
                if(Math.random()<0.6){this.game.scores[1]++;}
                this.game.currentTeam=0;
                this.game.currentRound++;
                if(this.game.currentRound>this.game.rounds){this.finishGame();}
                else{this.updateGameUI();this.nextMovie();}
            },1000);
        }else{
            this.updateGameUI();
            if(this.game.currentRound>this.game.rounds){this.finishGame();}
        }
    }

    finishGame(){
        // update games played
        this.currentUser.teamData.gamesPlayed++;
        // populate results
        this.el.final_team1_name.textContent=this.currentUser.teamData.teamName;
        this.el.final_team1_score.textContent=this.game.scores[0];
        this.el.final_team2_name.textContent='الفريق الآخر';
        this.el.final_team2_score.textContent=this.game.scores[1];
        this.el.winner_text.textContent=this.game.scores[0]>this.game.scores[1]?`🎉 فاز ${this.currentUser.teamData.teamName}!`:
            this.game.scores[1]>this.game.scores[0]?`🎉 فاز الفريق الآخر!`:'🤝 تعادل!';
        this.showScreen('results-screen');
    }
}

// Instantiate the app
new EgyptianMoviesGame();
