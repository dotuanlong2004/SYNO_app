// @ts-nocheck
'use strict';

/**
 * Test script kiem tra ket noi may cham cong ZKTeco
 */

require('dotenv').config();
const ZKLib = require('node-zklib');
const net = require('net');

const MACHINE_IP = process.env.MACHINE_IP || '192.168.1.225';
const MACHINE_PORT = Number(process.env.MACHINE_PORT || 4370);
const MACHINE_TIMEOUT = Number(process.env.MACHINE_TIMEOUT_MS || 10000);

console.log('==========================================');
console.log('   ZK Device Connection Test');
console.log('==========================================');
console.log(`IP: ${MACHINE_IP}`);
console.log(`Port: ${MACHINE_PORT}`);
console.log(`Timeout: ${MACHINE_TIMEOUT}ms`);
console.log('------------------------------------------');

// Test TCP connectivity truoc
function testTcpConnection(ip, port, timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            console.log('   ✓ TCP Ping: Port mo, co the ket noi');
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log('   ✗ TCP Ping: Timeout - khong phan hoi');
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (err) => {
            console.log(`   ✗ TCP Ping: Loi - ${err.message}`);
            socket.destroy();
            resolve(false);
        });
        
        socket.connect(port, ip);
    });
}

async function testConnection() {
    // Test TCP truoc
    console.log('0. Kiem tra TCP connectivity...');
    const tcpOk = await testTcpConnection(MACHINE_IP, MACHINE_PORT, 5000);
    if (!tcpOk) {
        console.error('   Khong the mo TCP connection den may cham cong.');
        console.error('   Kiem tra: IP, port, firewall, may cham cong co bat khong.');
    }
    console.log('');
    
    const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, MACHINE_TIMEOUT, 4000);
    
    try {
        console.log('1. Dang ket noi ZKLib...');
        console.log('   Debug: zk object created, calling createSocket...');
        await zk.createSocket();
        console.log('   ✓ Ket noi thanh cong!');

        console.log('2. Dang lay thong tin thiet bi...');
        const info = await zk.getInfo();
        console.log('   ✓ Thong tin thiet bi:', info);

        console.log('3. Dang lay du lieu cham cong...');
        const attendances = await zk.getAttendances();
        const logs = Array.isArray(attendances?.data) 
            ? attendances.data 
            : Array.isArray(attendances) 
                ? attendances 
                : [];
        console.log(`   ✓ So ban ghi: ${logs.length}`);
        
        if (logs.length > 0) {
            console.log('   ✓ Ban ghi moi nhat:', logs[logs.length - 1]);
        }

        console.log('4. Dang lay danh sach nguoi dung...');
        const users = await zk.getUsers();
        console.log(`   ✓ So nguoi dung: ${users?.data?.length || 0}`);

        console.log('5. Dang ngat ket noi...');
        await zk.disconnect();
        console.log('   ✓ Da ngat ket noi.');

        console.log('==========================================');
        console.log('   ✓✓✓ TAT CA KIEM TRA THANH CONG! ✓✓✓');
        console.log('==========================================');
        return true;

    } catch (error) {
        console.error('==========================================');
        console.error('   ✗✗✗ LOI KET NOI ✗✗✗');
        console.error('==========================================');
        console.error('Loi message:', error.message || '(khong co message)');
        console.error('Loi type:', error.constructor?.name || typeof error);
        console.error('Loi object:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        console.error('');
        console.error('Kiem tra:');
        console.error('- May cham cong da bat nguon chua?');
        console.error('- May tinh va may cham cong cung mang WiFi?');
        console.error(`- IP ${MACHINE_IP} co dung khong?`);
        console.error(`- Port ${MACHINE_PORT} co dung khong? (ZKTeco thuong dung 4370 hoac 5055)`);
        console.error('- Co firewall chan khong?');
        console.error('- SDK cua may cham cong co hoat dong khong?');
        
        try {
            await zk.disconnect();
        } catch {}
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});
