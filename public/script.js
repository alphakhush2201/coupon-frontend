const API_URL = 'https://assign-production-f077.up.railway.app';

document.addEventListener('DOMContentLoaded', function() {
    const claimButton = document.getElementById('claimButton');
    const resultDiv = document.getElementById('result');
    const timerDiv = document.getElementById('timer');
    
    let countdownInterval;
    
    checkLocalStorage();
    
    function checkLocalStorage() {
        const savedClaim = localStorage.getItem('lastClaim');
        if (savedClaim) {
            const claimData = JSON.parse(savedClaim);
            const currentTime = new Date().getTime();
            const elapsedTime = currentTime - claimData.timestamp;
            const timeLimit = 60 * 60 * 1000; // 1 hour in milliseconds
            
            if (elapsedTime < timeLimit) {
                const timeRemaining = Math.ceil((timeLimit - elapsedTime) / 1000);
                resultDiv.innerHTML = `<p>You've already claimed coupon ${claimData.coupon}. Please wait before claiming another.</p>`;
                resultDiv.className = 'result-container error';
                startCountdown(timeRemaining);
                claimButton.disabled = true;
            } else {
                localStorage.removeItem('lastClaim');
            }
        }
    }
    
    async function claimCoupon() {
        try {
            claimButton.disabled = true;
            resultDiv.innerHTML = 'Processing your request...';
            resultDiv.className = 'result-container';
            
            const response = await fetch(`${API_URL}/api/coupons/claim`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    browserSession: generateSessionId(),
                    ipAddress: await getIPAddress()
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to claim coupon');
            }

            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('lastClaim', JSON.stringify({
                    coupon: data.couponCode,
                    timestamp: new Date().getTime()
                }));
                
                resultDiv.innerHTML = `
                    <p>Success!</p>
                    <div class="coupon-code">${data.couponCode}</div>
                `;
                resultDiv.className = 'result-container success';
            } else {
                resultDiv.innerHTML = `<p>${data.message}</p>`;
                resultDiv.className = 'result-container error';
                
                if (data.waitTimeInSeconds) {
                    localStorage.setItem('lastClaim', JSON.stringify({
                        coupon: data.lastCoupon,
                        timestamp: new Date().getTime() - ((3600 - data.waitTimeInSeconds) * 1000)
                    }));
                    
                    startCountdown(data.waitTimeInSeconds);
                } else {
                    claimButton.disabled = false;
                }
            }
        } catch (error) {
            resultDiv.innerHTML = 'An error occurred. Please try again later.';
            resultDiv.className = 'result-container error';
            claimButton.disabled = false;
        }
    }

    function startCountdown(seconds) {
        clearInterval(countdownInterval);
        
        updateTimerDisplay(seconds);
        
        countdownInterval = setInterval(() => {
            seconds--;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                timerDiv.textContent = 'You can claim a new coupon now!';
                claimButton.disabled = false;
                localStorage.removeItem('lastClaim');
            } else {
                updateTimerDisplay(seconds);
            }
        }, 1000);
    }
    
    function updateTimerDisplay(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        timerDiv.textContent = `Time until next coupon: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    async function getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    claimButton.addEventListener('click', claimCoupon);
});
