Bitaxe-Dashboard is designed in NodeJS 22. The primary goal was to build a lightweight web client that shows the status of one or more Bitaxe 60x Gamma crypto miner(s) and the status of a Mining Core Stratum proxy.
The application can be configured using the config.json file. Ideally, this dashboard should be run from Docker, see instructions below.
The application is mobile friendly, so you can see it on an iPhone for example, or full screen on a trandional web browser such as Chrome.

> [!CAUTION]
> I am not responsible for anything you do with this code, or anything this code does to you! You are using this at your own risk!

# Quick Start Guide
If you don't want to mess with the install, follow the quick start guide
[Documentation](https://github.com/scottwalter/bitaxe-dashboard/wiki/Quick-Start-%E2%80%90-Bootstrap)

# Install Instructions
>[!IMPORTANT]
>-Assumptions
>- You have Docker installed and configured
>- You are on either a Mac Apple Silicon or Linux AMD64 device (for Docker, only supports Linux/arm4 and Linux/amd64)

Docker Install (Recommended!): All commands assumed as root or with sudo pre-fixed
1. Create a local folder for the config.json, access.json & jsonWebToken.json files. (i.e. /data/bitaxe-dashboard/config)
2. Copy the config.json, access.json & jsonWebToken.json into the config directory (this is as of Version 2.0)
3. Configure the config.json to your environment (See below)
4. Run the following Docker command:
```bash
docker run -d --name bitaxe-dashboard -p 3000:3000/tcp -v {/your/local/config_path}:/app/config scottwalter/bitaxe-dashboard:latest
```
5. You are done! Go to http://{IP_ADDRESS}:3000 and see your information! Enjoy!

How to configure:
Here is the basic config.json

```json
{
    "bitaxe_dashboard_version":2.0,
    "web_server_port": 3000,
    "disable_authentication":false,
    "cookie_max_age":3600,
    "disable_settings":false,
    "disable_configurations": false,
    "demo_mode":true,
    "title":"Bitaxe Dashboard",
    "bitaxe_instances": [
        {"Bitaxe1":"http://127.0.0.1"},
        {"Bitaxe2":"http://127.0.0.1"}
    ],
    "display_fields":[
        {"Mining Metrics":[
            {"hashRate":"Hashrate"},
            {"expectedHashrate":"Expect Hashrate"},
            {"bestDiff":"Best Difficulty"},
            {"bestSessionDiff":"Best Session Difficulty"},
            {"poolDifficulty":"Pool Difficulty"},
            {"sharesAccepted":"Shares Accepted"},
            {"sharesRejected":"Shares Rejected"},
            {"sharesRejectedReasons":"Shares Rejected Reasons"},
            {"responseTime":"Response Time"}
        ]},
        {"General Information":[
            {"hostname":"Hostname"},
            {"power":"Power"},
             {"voltage":"Voltage"},
             {"coreVoltageActual":"ASIC Voltage"},
             {"frequency":"Frequency"},
             {"temp":"ASIC Temp"},
             {"vrTemp":"VR Temp"},
             {"fanspeed":"Fan Speed"},
             {"minFanSpeed":"Min Fan Speed"},
             {"fanrpm":"Fan RPM"},
             {"temptarget":"Target Temp"},
             {"overheat_mode":"Over Heat Mode"},
             {"uptimeSeconds":"Uptime"},
             {"coreVoltage":"Core Voltage"},
             {"current":"Current"},
             {"wifiRSSI":"Wifi RSSI"},
             {"stratumURL":"Stratum URL"},
             {"stratumUser":"Stratum User"},
             {"stratumPort":"Stratum Port"},
             {"axeOSVersion":"AxeOS Version"},
             {"idfVersion":"IDF Version"},
             {"boardVersion":"Board Version"},
	         {"ASICModel":"ASIC Chip"}
             
        ]}
        
    ],
    "mining_core_enabled":true,
    "mining_core_url":"http://127.0.0.1:4000",
    "mining_core_display_fields": [
        {"Network Status":[
            {"networkHashrate":"Network Hashrate"},
            {"networkDifficulty":"Network Difficulty"},
            {"lastNetworkBlockTime":"Last Block Time"},
            {"blockHeight":"Block Height"},
            {"connectedPeers":"Connected Peers"},
            {"nodeVersion":"Node Version"}
        ]},
        {"Miner(s) Status":[
            {"connectedMiners":"Connected Miners"},
            {"poolHashrate":"Pool Hashrate"}
        ]},
        {"Rewards Status": [
            {"totalPaid":"Total Paid"},
            {"totalBlocks":"Total Blocks"},
            {"totalConfirmedBlocks":"Total Confirmed Blocks"},
            {"totalPendingBlocks":"Totoal Pending Blocks"},
            {"lastPoolBlockTime":"Last Pool Block Time"},
            {"blockReward":"Block Reward"}
        ]}
    ]
}
```
Basic access.json
```json
{
    "username":"{SHA256_PASSWORD_STRING}"
}
```
Basic jsonWebToken.json
```json
{ 
    "jsonWebTokenKey":"{YOUR_OWN_Some_Super_Secret_Key}",
    "expiresIn":"1h"
}
```
What can you do with the config.json?
> [!IMPORTANT]
> First, make sure you set demo_mode to false in your local config.json or it will just use dummy data!
- You can turn on Mining Core information or off if you don't use Mining Core but still want to monitor you Bitaxe device(s), set mining_core_enabled to either true or false.
- You can add any additional Bitaxe /api/system/info keys you want, or remove any keys you don't want.
> [!TIP]
> Go to http://{your_bitaxe_ip_address}/api/system/info to see the possible keys.
- You can reorder sections or individual key:value pairs to the way you want to see the data, the application will dynamically read them and follow what you set. 
- The rest should be fairly self-explanitory (title, ports, bitaxe_instances - Name them whatever you want, just make sure the URL is correct!)
- cookie_max_age should be set to the same length of time as expiresIn or longer.
- If you set disable_authentication to true, the dashboard will not ask for username / password. If you have disable_settings set to false, this is a bad idea, you will be allowing anyone to change your miner's settings.
- If you set disable_settings to true, this will disable the ability to modify settings of each miner, basically making the dashboard read-only. 
>[!WARNING] 
> It is highly recommended that you have disable_authentication set to false if you have disable_settings set to false.

>[!TIP]
> You MUST have SSL (aka HTTPS) enabled for your bitaxe-dasboard for it to work with disable_authentication set to false. This is becuase subtleCrypto requires SSL for SHA265 message digests.


How to configure access.json
- username, is the username for the login username, duh! If you do NOT create a local access.json file the default username is admin (bad idea to keep this!)
- {SHA256_PASSWORD_STRING}, is the SHA256 encrypted password for the username. If you do NOT create a local access.json file the default password is password (for the admin username). (bad idea to keep this!)

How to generate a SHA265 passsword on Ubuntu (or pretty much any Linux box)
```bash
echo -n "password" | sha256sum
```
>[!TIP]
>Take only the String part, not the space - at the end of the output. Example: 

```bash
5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8  -
```

>[!TIP]
>Only copy up to the last character (the 8 in the example above)

How to configure jsonWebToken.json
- Replace {YOUR_OWN_Some_Super_Secret_Key} with your own secret key. Make it a large set of numbers and letters, at least 32 characters.
- ExpiresIn - this sets the length of time the JWT will be valid. In the example above, it is 1 hour (1h).

Fun Facts
- The bar scales for temp, vrTemp, and fanspeed will change from green to yellow to red based on value. The idea is to let you quickly spot an issue. 
    - For temp, <=60 = Green, 61 - 65 = Yellow, >66 = Red
    - For vrTemp, <=70 = Green, 71 - 85 = Yellow, >86 = Red
    - For fanspeed, <=80 = Green, 81-95 = Yellow, >95 = Red
- The Device List shows a status indicator for each Bitaxe Device, Green - Bitaxe Dashboard can reach the device's API, Red - The device is likely down or offline.

Recommended:
- You can run this on the public internet and see your Bitaxe information since the application will make the internal calls to your Bitaxe device API.
> [!WARNING]
> Placing anything on the internet is risky. I **highly recommend** you front this application with a proxy like Nginx, under SSL, using a username / password.

- Here is a sample Nginx configuration for use as a reverse proxy for the bitaxe-dashboard
```nginx
server {
    listen 443 ssl;
    server_name status.xxx.com;
    ssl_certificate /etc/nginx/ssl/status.xxx.com/certificate.crt; # or your_domain.crt/pem
    ssl_certificate_key /etc/nginx/ssl/status.xxx.com/private.key;

    # Optional: Recommended SSL settings for security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers "HIGH:!aNULL:!MD5";
        
    location / {
        proxy_pass http://192.168.7.100:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
	    proxy_buffering off;
	    gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_buffers 16 8k;
        gzip_http_version 1.1;
        gzip_min_length 256;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/x-icon image/bmp image/svg+xml;
    }
}
```
