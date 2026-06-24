$path = "components/Layout/Header.tsx"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Fix 1: normalizeCategoryLabel - replace the 4 corrupt regex lines with clean diacritic removal
$old = ".normalize('NFD')`r`n    .replace(/[`0`x00`-`x1F`x7F`-`x7F]/g, '')`r`n    .replace(/[`0`x00`-`x7F]/g, '')`r`n    .replace(/[`0`x00`-`x1F]/g, '')`r`n    .replace(/[`0`x00`-`x7F]/g, '');"
$new = ".normalize('NFD')`r`n    .replace(/\p{Diacritic}/gu, '');"

# Actually, I can't type null bytes in the script. Let me use a different approach:
# Find the normalizeCategoryLabel function and identify the corrupt regex by context

# Find index of normalizeCategoryLabel
$f1 = $text.IndexOf("export function normalizeCategoryLabel")
if ($f1 -ge 0) {
    # Find the opening of the function body
    $brace = $text.IndexOf("{", $f1)
    # Find "normalize('NFD')" in this function
    $nfd = $text.IndexOf("normalize('NFD')", $f1)
    # Find the closing "}" of the function (it's followed by a blank line then function slugifyCategory)
    $f2 = $text.IndexOf("function slugifyCategory", $f1)
    $funcClose = $text.LastIndexOf("}", $f2 - 1)
    
    if ($nfd -gt 0 -and $funcClose -gt $nfd) {
        # Get the text from after normalize('NFD') to before the closing }
        $bodyStart = $text.IndexOf("`n", $nfd) + 1  # line after normalize('NFD')
        # The function body ends at the } before slugifyCategory
        # But we need to find the ; before that }
        $semiBeforeClose = $text.LastIndexOf(";", $funcClose - 1)
        if ($semiBeforeClose -gt 0) {
            $oldLen = $funcClose - $bodyStart
            $replacement = "    .replace(/\p{Diacritic}/gu, '');`r`n"
            $text = $text.Remove($bodyStart, $oldLen).Insert($bodyStart, $replacement)
            Write-Output "Fixed normalizeCategoryLabel"
        }
    }
}

# Fix 2: slugifyCategory - remove the corrupt regex line
$f1 = $text.IndexOf("function slugifyCategory")
if ($f1 -ge 0) {
    $nfd = $text.IndexOf("normalize('NFD')", $f1)
    if ($nfd -gt 0) {
        $lineBeforeNfd = $text.LastIndexOf("`n", $nfd - 2)
        $lineAfterNfd = $text.IndexOf("`n", $nfd) + 1
        # Find the \p{Diacritic} line - that's the one we want to keep
        $dia = $text.IndexOf("\p{Diacritic}", $lineAfterNfd)
        if ($dia -gt 0) {
            $lineBeforeDia = $text.LastIndexOf("`n", $dia - 2) + 1
            # Remove everything from lineAfterNfd to lineBeforeDia (the corrupt line)
            $oldLen = $lineBeforeDia - $lineAfterNfd
            if ($oldLen -gt 0) {
                $text = $text.Remove($lineAfterNfd, $oldLen)
                Write-Output "Fixed slugifyCategory (removed corrupt line)"
            }
        }
    }
}

# Fix 3: Replace corrupt text strings (using the existing corrupt bytes as they are in the file)
# We know the corrupt patterns from the earlier read. Let me find them by byte pattern.
# The key insight: in the UTF-8 file, "Sábanas" may be stored as specific bytes.
# But the corrupt version "Sǭbanas" has different bytes.

# Let me just find and replace all known corrupt strings
$replacements = @(
    @{old='Sǭbanas'; new='Sábanas'},
    @{old='sǭbanas'; new='sábanas'}
)

foreach ($r in $replacements) {
    $count = 0
    while ($text.IndexOf($r.old) -ge 0) {
        $text = $text.Replace($r.old, $r.new)
        $count++
    }
    if ($count -gt 0) {
        Write-Output "Replaced '$($r.old)' -> '$($r.new)' ($count times)"
    }
}

# Fix Blanquería - find "Blanquer" followed by non-í
# The original should have "Blanquería" with proper UTF-8 encoding of í (C3 AD)
# The corrupt version has garbled bytes instead
$idx = $text.IndexOf("Blanquer")
$fixCount = 0
while ($idx -ge 0) {
    $nextChar = $text[[int]($idx + 8)]
    if ($nextChar -ne [char]0xED -or ($idx + 9) -lt $text.Length -and $text[$idx + 9] -ne [char]0) {  # í is U+00ED
        # Check if the text after Blanquer is not "ía"
        $after = if ($idx + 10 -le $text.Length) { $text.Substring($idx, 10) } else { "" }
        if ($after -cne "Blanquería") {
            $text = $text.Remove($idx, 10).Insert($idx, "Blanquería")
            $fixCount++
        }
    }
    $idx = $text.IndexOf("Blanquer", $idx + 1)
}
if ($fixCount -gt 0) { Write-Output "Fixed Blanquería ($fixCount times)" }

# Fix botón, sesión, artículos
# Comment: "Botón Ingresar"
$idx = $text.IndexOf("Bot")
while ($idx -ge 0) {
    if ($idx + 12 -le $text.Length) {
        $segment = $text.Substring($idx, 12)
        if ($segment -like "Bot* Ingresar" -and $segment -cne "Botón Ingresar") {
            $text = $text.Remove($idx, 12).Insert($idx, "Botón Ingresar")
            Write-Output "Fixed Botón Ingresar"
        }
    }
    $idx = $text.IndexOf("Bot", $idx + 1)
}

# "Cerrar Sesión"
$idx = $text.IndexOf("Cerrar")
while ($idx -ge 0) {
    if ($idx + 14 -le $text.Length) {
        $segment = $text.Substring($idx, 14)
        if ($segment -cne "Cerrar Sesión" -and $segment -like "Cerrar*") {
            $text = $text.Remove($idx, 14).Insert($idx, "Cerrar Sesión")
            Write-Output "Fixed Cerrar Sesión"
        }
    }
    $idx = $text.IndexOf("Cerrar", $idx + 1)
}

# "artículos de cocina"
$idx = $text.IndexOf("art")
while ($idx -ge 0) {
    if ($idx + 20 -le $text.Length) {
        $segment = $text.Substring($idx, 20)
        if ($segment -like "art*culos de cocina" -and $segment -cne "artículos de cocina") {
            $text = $text.Remove($idx, 20).Insert($idx, "artículos de cocina")
            Write-Output "Fixed artículos de cocina"
        }
    }
    $idx = $text.IndexOf("art", $idx + 1)
}

# Fix cart icon - find between cartIcon div opening and {items.length}
$cartStart = $text.IndexOf('className={styles.cartIcon}>')
if ($cartStart -ge 0) {
    $itemsStart = $text.IndexOf('{items.length', $cartStart)
    $garbage = $text.Substring($cartStart + 28, $itemsStart - $cartStart - 28)
    # Remove any non-whitespace, non-newline content
    $clean = ""
    foreach ($ch in $garbage.ToCharArray()) {
        if ($ch -eq " " -or $ch -eq "`r" -or $ch -eq "`n" -or $ch -eq "`t") {
            $clean += $ch
        }
    }
    if ($clean -ne $garbage) {
        $text = $text.Remove($cartStart + 28, $garbage.Length).Insert($cartStart + 28, $clean)
        Write-Output "Fixed cart icon (removed garbage)"
    }
}

[System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
Write-Output "`nAll fixes applied to Header.tsx"