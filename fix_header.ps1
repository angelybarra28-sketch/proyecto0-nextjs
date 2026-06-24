$path = "components/Layout/Header.tsx"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Show current state of the normalizeCategoryLabel function for debugging
$idx = $text.IndexOf("normalizeCategoryLabel")
Write-Output "normalizeCategoryLabel found at index: $idx"

# Find the normalizeCategoryLabel function body end and replace with clean version
# Strategy: find the function opening, go to the closing brace
$funcStart = $text.IndexOf("normalizeCategoryLabel")
if ($funcStart -ge 0) {
    # Find "normalize('NFD')" after the function name
    $nfdStart = $text.IndexOf("normalize('NFD')", $funcStart)
    if ($nfdStart -ge 0) {
        $lineEnd = $text.IndexOf("`n", $nfdStart)
        $lineStart = $text.LastIndexOf("`n", $nfdStart) + 1
        # Find the closing ";" of the return statement (4 lines of replace)
        $semicolon = $text.IndexOf(";", $nfdStart)
        for ($i = 0; $i -lt 4; $i++) {
            $semicolon = $text.IndexOf(";", $semicolon + 1)
            if ($semicolon -lt 0) { break }
        }
        # Extract the corrupt block from lineStart to after last semicolon
        $blockLen = $semicolon - $lineStart + 1
        $oldBlock = $text.Substring($lineStart, $blockLen)
        $newBlock = "    .normalize('NFD')`r`n    .replace(/\p{Diacritic}/gu, '');`r`n"
        
        Write-Output "Old block length: $($oldBlock.Length)"
        Write-Output "New block length: $($newBlock.Length)"
        
        $text = $text.Remove($lineStart, $blockLen).Insert($lineStart, $newBlock)
        Write-Output "normalizeCategoryLabel replaced"
    }
}

# Find and fix slugifyCategory
$funcStart = $text.IndexOf("function slugifyCategory")
if ($funcStart -ge 0) {
    $nfdStart = $text.IndexOf("normalize('NFD')", $funcStart)
    if ($nfdStart -ge 0) {
        $lineStart = $text.LastIndexOf("`n", $nfdStart) + 1
        # Find the line with \p{Diacritic}
        $diacriticStart = $text.IndexOf("\p{Diacritic}", $nfdStart)
        if ($diacriticStart -ge 0) {
            $diacriticLineStart = $text.LastIndexOf("`n", $diacriticStart) + 1
            # Remove everything from lineStart to diacriticLineStart
            $oldBlock = $text.Substring($lineStart, $diacriticLineStart - $lineStart)
            $newBlock = "    .normalize('NFD')`r`n    .replace(/\p{Diacritic}/gu, '')`r`n"
            $text = $text.Remove($lineStart, $oldBlock.Length).Insert($lineStart, $newBlock)
            Write-Output "slugifyCategory replaced"
        }
    }
}

# Fix text corruptions
$replacements = @(
    @{old='Sǭbanas'; new='Sábanas'},
    @{old='sǭbanas'; new='sábanas'}
)

foreach ($r in $replacements) {
    $text = $text.Replace($r.old, $r.new)
}

# Fix Blanquería - search by surrounding context
$idx = $text.IndexOf("Blanquer")
while ($idx -ge 0) {
    # Check if the next char is not í
    if ($idx + 9 -lt $text.Length) {
        $segment = $text.Substring($idx, 10)
        if ($segment -ne "Blanquería") {
            $text = $text.Remove($idx, 10).Insert($idx, "Blanquería")
            Write-Output "Fixed Blanquería at $idx"
        }
    }
    $idx = $text.IndexOf("Blanquer", $idx + 1)
}

# Fix Botón in comment
$idx = $text.IndexOf("Bot")
while ($idx -ge 0) {
    if ($idx + 5 -lt $text.Length) {
        $segment = $text.Substring($idx, 6)
        if ($segment -cne "Botón " -and $segment -match "^Bot") {
            $text = $text.Remove($idx, 5).Insert($idx, "Botón")
            Write-Output "Fixed Botón at $idx"
        }
    }
    $idx = $text.IndexOf("Bot", $idx + 1)
}

# Fix Cerrar Sesión
$idx = $text.IndexOf("Cerrar")
if ($idx -ge 0) {
    $segment = $text.Substring($idx, 13)
    if ($segment -ne "Cerrar Sesión") {
        $text = $text.Remove($idx, 13).Insert($idx, "Cerrar Sesión")
        Write-Output "Fixed Cerrar Sesión"
    }
}

# Fix cart icon - find between cartIcon div and {items.length}
$cartIcon = $text.IndexOf('className={styles.cartIcon}>')
if ($cartIcon -ge 0) {
    $itemsLenStart = $text.IndexOf('{items.length', $cartIcon)
    $iconContent = $text.Substring($cartIcon + 28, $itemsLenStart - $cartIcon - 28)
    if ($iconContent.Trim().Length -gt 0 -and $iconContent.Trim() -ne "🛒") {
        $text = $text.Remove($cartIcon + 28, $itemsLenStart - $cartIcon - 28).Insert($cartIcon + 28, "🛒`r`n            ")
        Write-Output "Fixed cart icon"
    }
}

# Fix artículos de cocina
$idx = $text.IndexOf("art")
while ($idx -ge 0) {
    $segment = $text.Substring($idx, [Math]::Min(19, $text.Length - $idx))
    if ($segment -like "art*culos de cocina") {
        $text = $text.Remove($idx, 19).Insert($idx, "artículos de cocina")
        Write-Output "Fixed artículos de cocina at $idx"
    }
    $idx = $text.IndexOf("art", $idx + 1)
}

[System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
Write-Output "`nHeader.tsx fixes complete"