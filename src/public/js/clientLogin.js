document.addEventListener('DOMContentLoaded', () => {
    /**
     * SHA256 hash for sending password
     * Worth noting, this is not the only security you should use! 
     * It just helps secure, you should always transmit data over HTTPS!
     */
    async function hashPasswordSHA256(password) {
        // 1. Encode the password string into a Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(password);

        // 2. Hash the data using SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        // 3. Convert the ArrayBuffer hash to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                const hashedPassword = await hashPasswordSHA256(password);
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, hashedPassword }),
                });

                if (response.ok) {
                    // On successful login, redirect to the dashboard
                    window.location.href = '/';
                } else {
                    const result = await response.json();
                    // Display error message from the server
                    loginError.textContent = result.message || 'An unknown error occurred.';
                    loginError.style.display = 'block';
                }
             
            } catch (error) {
                console.error('Login request failed:', error);
                loginError.textContent = 'Failed to connect to the server. Please try again later.';
                loginError.style.display = 'block';
            }
        });
    }
    
});