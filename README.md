Bitaxe-Dashboard is designed in NodeJS 22. The primary goal was to build a lightweight web client that shows the status of one or more Bitaxe 60x Gamma crypto miner(s) and the status of a Mining Core Stratum proxy.
The application can be configured using the config.json file. Ideally, this dashboard should be run from Docker, see instructions below.
The application is mobile friendly, so you can see it on an iPhone for example, or full screen on a trandional web browser such as Chrome.

> [!CAUTION]
> I am not responsible for anything you do with this code, or anything this code does to you! You are using this at your own risk!
 
Quick Start:
Assumptions:
1. You have Docker installed and configured
2. You are on either a Mac Apple Silicon or Linux AMD64 device (for Docker, only supports Linux/arm4 and Linux/amd64)

Docker Install (Recommended!): All commands assumed as root or with sudo pre-fixed
1. Create a local folder for the config.json file (i.e. /data/bitaxe-dashboard/config)
2. Copy the config.json into a file in that directory, naming it config.json
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
    "bitaxe_dashboard_version":1.0,
    "web_server_port": 3000,
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
            {"lasNetworkBlockTime":"Last Block Time"},
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
What can you do with the config.json?
> [!IMPORTANT]
> First, make sure you set demo_mode to false in your local config.json or it will just use dummy data!
- You can turn on Mining Core information or off if you don't use Mining Core but still want to monitor you Bitaxe device(s), set mining_core_enabled to either true or false.
- You can add any additional Bitaxe /api/system/info keys you want, or remove any keys you don't want.
> [!TIP]
> Go to http://{your_bitaxe_ip_address}/api/system/info to see the possible keys.
- You can reorder sections or individual key:value pairs to the way you want to see the data, the application will dynamically read them and follow what you set. 
- The rest should be fairly self-explanitory (title, ports, bitaxe_instances - Name them whatever you want, just make sure the URL is correct!)

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
