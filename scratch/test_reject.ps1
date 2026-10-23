$body = @{ email = 'admin@hrm.local'; password = 'Admin@123' } | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
    $token = $res.token
    if (-not $token) { $token = $res.data.token }
    Write-Output "Logged in successfully. Token acquired."

    $headers = @{ Authorization = "Bearer $token" }
    $compRes = Invoke-RestMethod -Uri 'http://localhost:5007/api/admin/companies' -Headers $headers
    Write-Output "Companies count: $($compRes.data.Count)"

    # Test rejection on company ID 7 (or first company)
    $rejectRes = Invoke-RestMethod -Uri 'http://localhost:5007/api/admin/companies/7/reject?reason=Testing+rejection' -Method POST -Headers $headers
    Write-Output "Rejection API response:"
    $rejectRes | ConvertTo-Json -Depth 3
} catch {
    Write-Output "Error: $_"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Output "Body: $($reader.ReadToEnd())"
    }
}
