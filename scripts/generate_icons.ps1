New-Item -ItemType Directory -Force -Path 'public/icons'

Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$Size,
        [string]$OutPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background slate-950 (#020617)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 2, 6, 23))
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Orange circular badge (#ea580c)
    $margin = [int]($Size * 0.08)
    $badgeWidth = $Size - (2 * $margin)
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 234, 88, 12))
    $g.FillEllipse($badgeBrush, $margin, $margin, $badgeWidth, $badgeWidth)

    # Draw White 'H' in the center
    $fontFamily = New-Object System.Drawing.FontFamily('Arial')
    $fontSize = [float]($Size * 0.48)
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString('H', $font, $textBrush, $rect, $sf)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Icon -Size 192 -OutPath 'public/icons/icon-192x192.png'
Generate-Icon -Size 512 -OutPath 'public/icons/icon-512x512.png'
Generate-Icon -Size 512 -OutPath 'public/icons/icon-maskable-512x512.png'
Generate-Icon -Size 180 -OutPath 'public/icons/apple-touch-icon.png'

Write-Host "Icons generated successfully!"
