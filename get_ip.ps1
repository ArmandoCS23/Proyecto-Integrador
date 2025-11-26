#!/usr/bin/env powershell
# Script para obtener la IP local del PC

Write-Host "=== IP Addresses Disponibles ===" -ForegroundColor Green
Write-Host ""

$interfaces = Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up"}

foreach ($interface in $interfaces) {
    $ip = $interface.IPv4Address.IPAddress
    $adapter = $interface.NetAdapter.Name
    Write-Host "Adaptador: $adapter"
    Write-Host "IP: $ip"
    Write-Host ""
}

Write-Host ""
Write-Host "Usa la IP que corresponde a tu red (generalmente la que comienza con 192.168 o 10.0)" -ForegroundColor Yellow
