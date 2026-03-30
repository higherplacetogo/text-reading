document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const textDisplay = document.getElementById('textDisplay');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const getNewsBtn = document.getElementById('getNewsBtn');
    const themeToggle = document.getElementById('themeToggle');

    // 다크모드 설정
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    // 슬라이더 범위
    const MIN_SPEED = parseFloat(speedSlider.min);
    const MAX_SPEED = parseFloat(speedSlider.max);
    
    // 슬라이더 배경 업데이트 함수
    function updateSliderBackground() {
        const value = parseFloat(speedSlider.value);
        const percentage = ((value - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100;
        
        // CSS 변수로 처리 (모든 브라우저 공통)
        speedSlider.style.setProperty('--value', percentage + '%');
    }
    
    // 초기 슬라이더 배경 설정
    updateSliderBackground();

    // 테마 토글 버튼 클릭 이벤트
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggle.textContent = newTheme === DARK_THEME ? '☀️ Light' : '🌙 Dark';
        
        // 테마 변경 시 슬라이더 배경 업데이트
        setTimeout(updateSliderBackground, 50); // 테마 변경 후 약간의 지연을 두고 실행
    });

    // 기본 타이밍 상수
    const BASE_TYPING_DELAY = 15;  // 기본 타이핑 속도 (ms)
    const BASE_WORD_DELAY = 250;   // 기본 단어 간 딜레이 (ms)
    
    // 속도 범위 설정
    const DEFAULT_SPEED = 1.0;     // 기본 속도

    let words = [];
    let currentIndex = 0;
    let timeoutId = null;
    let displayedText = '';
    let isPaused = false;
    let currentSpeed = DEFAULT_SPEED;  // 기본 속도 1.0으로 설정

    // NPR RSS 피드 소스
    const rssSource = 'https://feeds.npr.org/1001/rss.xml';

    // 자체 Vercel 서버리스 프록시
    const proxyUrl = '/api/proxy?url=';

    // 일시정지 상태 관리 함수
    function setPauseState(paused) {
        isPaused = paused;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
        startBtn.disabled = !paused;
    }

    // 뉴스 가져오기 버튼 클릭 이벤트
    getNewsBtn.addEventListener('click', async () => {
        try {
            // 버튼 비활성화 및 로딩 표시
            getNewsBtn.disabled = true;
            getNewsBtn.textContent = 'Loading...';
            
            // NPR RSS 피드 가져오기
            const response = await fetch(proxyUrl + encodeURIComponent(rssSource));
            
            if (!response.ok) {
                throw new Error(`Failed to fetch NPR RSS feed: ${response.status}`);
            }
            
            const xmlText = await response.text();
            
            // XML 파싱
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // NPR RSS 아이템 가져오기
            const items = xmlDoc.querySelectorAll('item');
            
            if (items.length === 0) {
                throw new Error('No news articles found in the NPR feed');
            }
            
            // 랜덤 기사 선택
            const randomItem = items[Math.floor(Math.random() * items.length)];
            
            // 기사 정보 추출
            const title = randomItem.querySelector('title')?.textContent || 'No title available';
            const description = randomItem.querySelector('description')?.textContent || '';
            const link = randomItem.querySelector('link')?.textContent || '';
            const pubDate = randomItem.querySelector('pubDate')?.textContent || '';
            
            // 날짜 포맷팅
            let formattedDate = '';
            if (pubDate) {
                try {
                    formattedDate = new Date(pubDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } catch (error) {
                    console.error('Error formatting date:', error);
                    formattedDate = pubDate;
                }
            }
            
            // 본문 가져오기 시도
            let fullText = '';
            try {
                const articleResponse = await fetch(proxyUrl + encodeURIComponent(link));
                
                if (!articleResponse.ok) {
                    throw new Error(`Failed to fetch article content: ${articleResponse.status}`);
                }
                
                const articleHtml = await articleResponse.text();
                const articleDoc = new DOMParser().parseFromString(articleHtml, 'text/html');
                
                // NPR 기사 본문 (선택자를 순서대로 시도)
                const selectors = [
                    '[data-testid="primary-text"] p',
                    '#storytext p',
                    '.storytext p',
                    'article p',
                ];
                let paragraphs = [];
                for (const selector of selectors) {
                    paragraphs = articleDoc.querySelectorAll(selector);
                    if (paragraphs.length > 0) break;
                }
                fullText = Array.from(paragraphs)
                    .filter(p => p.textContent.trim().length > 0)
                    .map(p => p.textContent.trim())
                    .join('\n\n');
                
                // 본문을 가져오지 못한 경우
                if (!fullText || fullText.trim() === '') {
                    fullText = description || '기사 본문을 불러올 수 없습니다. 해당 웹사이트에서 직접 확인해 주세요.';
                }
            } catch (error) {
                console.error('Error fetching article content:', error);
                fullText = description || '기사 본문을 불러올 수 없습니다. 해당 웹사이트에서 직접 확인해 주세요.';
            }
            
            // 텍스트 입력 영역에 설정
            const articleText = `${title}\n\nSource: NPR${formattedDate ? `\nDate: ${formattedDate}` : ''}\n\n${fullText}`;
            textInput.value = articleText;
            
            // 버튼 상태 복원
            getNewsBtn.disabled = false;
            getNewsBtn.textContent = 'Get Random News';
            
        } catch (error) {
            console.error('Error fetching news:', error);
            textInput.value = `Error: ${error.message}\n\nPlease try again.`;
            
            // 버튼 상태 복원
            getNewsBtn.disabled = false;
            getNewsBtn.textContent = 'Try Again';
        }
    });

    // Update speed value display and adjust reading speed
    speedSlider.addEventListener('input', () => {
        // 슬라이더 값을 직접 속도로 사용
        currentSpeed = parseFloat(speedSlider.value);
        speedValue.textContent = currentSpeed.toFixed(1) + 'x';
        
        // 슬라이더 배경 업데이트
        updateSliderBackground();
        
        // 읽기가 진행 중일 때 속도 조절
        if (timeoutId && !isPaused) {
            // 현재 진행 중인 타이머 정리
            clearTimeout(timeoutId);
            
            // 현재 단어의 상태 초기화
            if (currentIndex > 0) {
                // 이전까지 표시된 텍스트만 유지
                displayedText = words.slice(0, currentIndex).join(' ');
                textDisplay.textContent = displayedText;
            }
            
            // 읽기 재시작
            startReading();
        }
    });

    // Start reading
    startBtn.addEventListener('click', () => {
        if (textInput.value.trim() === '') {
            alert('Please enter some text first!');
            return;
        }

        // 새로운 읽기 시작 시 초기화
        words = textInput.value.trim().split(/\s+/);
        currentIndex = 0;
        displayedText = '';
        textDisplay.textContent = '';
        
        // 진행 중인 타이머 정리
        clearTimeout(timeoutId);
        
        startReading();
        
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Pause 상태 초기화
        setPauseState(false);
    });

    // Pause reading
    pauseBtn.addEventListener('click', () => {
        if (!isPaused) {
            clearTimeout(timeoutId);
            setPauseState(true);
        } else {
            setPauseState(false);
            startReading();
        }
    });

    function stopReading() {
        clearTimeout(timeoutId);
        // displayedText와 textDisplay의 내용은 유지
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        setPauseState(false);
    }

    // 속도에 따른 딜레이 계산 함수
    function getAdjustedDelay(baseDelay, speed) {
        return baseDelay / speed;
    }

    function startReading() {
        // 임시 표시 영역 생성 (한번만 생성)
        const tempDisplay = document.createElement('div');
        tempDisplay.style.visibility = 'hidden';
        tempDisplay.style.position = 'absolute';
        tempDisplay.style.whiteSpace = 'pre-wrap';
        tempDisplay.style.width = textDisplay.clientWidth + 'px';
        tempDisplay.style.font = window.getComputedStyle(textDisplay).font;
        document.body.appendChild(tempDisplay);

        // 현재 진행 중인 단어의 상태를 추적
        let isDisplayingWord = false;
        let currentDisplayingWord = '';
        let currentBaseText = '';

        // 디바운스 함수
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // 다음 단어의 위치를 미리 계산하는 함수
        function calculateNextWordPosition(currentText, nextWord) {
            if (!currentText) return { text: nextWord, needsLineBreak: false };
            
            tempDisplay.textContent = currentText;
            const currentLines = tempDisplay.getClientRects().length;
            
            tempDisplay.textContent = currentText + ' ' + nextWord;
            const withSpaceLines = tempDisplay.getClientRects().length;
            
            tempDisplay.textContent = currentText + '\n' + nextWord;
            const withNewlineLines = tempDisplay.getClientRects().length;
            
            const needsLineBreak = withSpaceLines > currentLines || withSpaceLines > withNewlineLines;
            
            return {
                text: currentText + (needsLineBreak ? '\n' : ' ') + nextWord,
                needsLineBreak,
                baseText: currentText + (needsLineBreak ? '\n' : ' ')
            };
        }

        // ResizeObserver 설정 - 디바운스 적용
        const handleResize = debounce(() => {
            if (currentIndex > 0 && !isPaused) {
                tempDisplay.style.width = textDisplay.clientWidth + 'px';
                
                // 현재까지의 텍스트를 기반으로 줄바꿈 재계산
                const words = displayedText.split(/\s+/);
                let newText = words[0] || '';
                
                // 현재 표시 중인 단어가 있으면 그 이전까지만 처리
                const processUntil = isDisplayingWord ? currentIndex : words.length;
                
                for (let i = 1; i < processUntil; i++) {
                    const nextPosition = calculateNextWordPosition(newText, words[i]);
                    newText = nextPosition.text;
                }
                
                displayedText = newText;
                
                // 현재 표시 중인 단어가 있으면 해당 상태 유지
                if (isDisplayingWord && currentDisplayingWord) {
                    const nextPosition = calculateNextWordPosition(displayedText, currentDisplayingWord);
                    requestAnimationFrame(() => {
                        textDisplay.textContent = nextPosition.baseText + currentDisplayingWord;
                        textDisplay.scrollTop = textDisplay.scrollHeight;
                    });
                } else {
                    requestAnimationFrame(() => {
                        textDisplay.textContent = displayedText;
                        textDisplay.scrollTop = textDisplay.scrollHeight;
                        
                        // 현재 진행 중인 타이머가 있다면 취소
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        
                        // 다음 단어 표시 예약
                        if (!isPaused) {
                            timeoutId = setTimeout(displayNextWord, getAdjustedDelay(BASE_WORD_DELAY, currentSpeed));
                        }
                    });
                }
            }
        }, 150);

        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(textDisplay);

        // 단어를 한 글자씩 표시하는 함수
        function displayWordByChar(word, baseText, onComplete) {
            isDisplayingWord = true;
            currentDisplayingWord = word;
            currentBaseText = baseText;
            
            let charIndex = 0;
            const typingSpeed = getAdjustedDelay(BASE_TYPING_DELAY, currentSpeed);
            
            function showNextChar() {
                if (!isDisplayingWord) {
                    isDisplayingWord = false;
                    currentDisplayingWord = '';
                    currentBaseText = '';
                    onComplete();
                    return;
                }
                
                if (charIndex < word.length) {
                    requestAnimationFrame(() => {
                        textDisplay.textContent = baseText + word.substring(0, charIndex + 1);
                        textDisplay.scrollTop = textDisplay.scrollHeight;
                    });
                    charIndex++;
                    timeoutId = setTimeout(showNextChar, typingSpeed);
                } else {
                    isDisplayingWord = false;
                    currentDisplayingWord = '';
                    currentBaseText = '';
                    onComplete();
                }
            }
            
            showNextChar();
        }

        function displayNextWord() {
            if (currentIndex < words.length) {
                const currentWord = words[currentIndex];
                
                // 다음 단어의 최종 위치를 미리 계산
                const nextPosition = calculateNextWordPosition(displayedText, currentWord);
                const baseText = displayedText ? nextPosition.baseText : '';
                
                // 3글자 이하 단어는 한번에 표시
                if (currentWord.length <= 3) {
                    displayedText = nextPosition.text;
                    requestAnimationFrame(() => {
                        textDisplay.textContent = displayedText;
                        textDisplay.scrollTop = textDisplay.scrollHeight;
                    });
                    currentIndex++;
                    timeoutId = setTimeout(displayNextWord, getAdjustedDelay(BASE_WORD_DELAY, currentSpeed));
                    return;
                }
                
                // 4글자 이상 단어는 한 글자씩 표시
                displayWordByChar(currentWord, baseText, () => {
                    // 리사이즈나 다른 이유로 중단된 경우가 아닐 때만 계속 진행
                    if (isDisplayingWord) return;
                    displayedText = nextPosition.text;
                    currentIndex++;
                    timeoutId = setTimeout(displayNextWord, getAdjustedDelay(BASE_WORD_DELAY, currentSpeed));
                });
            } else {
                resizeObserver.disconnect();
                if (tempDisplay.parentNode) document.body.removeChild(tempDisplay);
                requestAnimationFrame(() => {
                    stopReading();
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                });
            }
        }
        
        displayNextWord();
    }
});