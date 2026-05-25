# ZKCollector - Windows Service for AI-X1

## Real-time Attendance Collection

This Windows Service connects to Ronald Jack AI-X1 using zkemkeeper.dll COM SDK and pushes attendance logs to Supabase in real-time.

## Prerequisites

- Windows 10/11/Server with .NET Framework 4.7.2+
- zkemkeeper.dll already installed in `C:\Windows\SysWOW64\`
- Supabase credentials

## Installation Steps

1. **Verify zkemkeeper.dll** (should already be in `C:\Windows\SysWOW64\`):
   ```cmd
   dir C:\Windows\SysWOW64\zkemkeeper.dll
   ```

2. **Install Windows Service**:
   ```cmd
   sc create ZKCollector binPath= "C:\ZKCollector\bin\ZKCollector.exe" start= auto
   sc description ZKCollector "Ronald Jack AI-X1 Real-time Attendance Collector"
   sc start ZKCollector
   ```

3. **Verify running**:
   ```cmd
   sc query ZKCollector
   powershell "Get-Content C:\ZKCollector\logs\collector.log -Wait -Tail 20"
   ```

## Configuration

Edit `config.json` with your settings:
- Device IP: 192.168.0.225
- Device Port: 4370
- Supabase URL and Key
- Polling interval: 2 minutes (backup)

## Features

- Real-time event: `OnAttTransaction` triggers immediate push
- Polling backup: Every 2 minutes for missed events
- Reconnect logic: Exponential backoff on connection loss
- Local state: Saves `last_pull_time` to file
- Logic Vào/Ra: Alternates In/Out + 10-minute block

## Troubleshooting

- **Error -2**: MITA Pro is using port 4370. Close MITA first.
- **Service won't start**: Check .NET Framework 4.7.2 is installed
- **COM error**: Run `regsvr32 zkemkeeper.dll` as Administrator
