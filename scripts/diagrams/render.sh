#!/bin/sh
set -eu
umask 077
case "$1" in
  tikz)
    printf '%s\n' '\documentclass[tikz,border=8pt]{standalone}' '\usepackage{amsmath,amssymb}' '\usetikzlibrary{arrows.meta,calc,positioning,decorations.pathmorphing,cd}' '\begin{document}' > diagram.tex
    cat /input/source >> diagram.tex
    printf '%s\n' '\end{document}' >> diagram.tex
    pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error -file-line-error diagram.tex >&2
    ;;
  asymptote)
    cp /input/source diagram.asy
    asy -safe -noglobalread -noglobalwrite -noV -nointeractiveView -f pdf -tex pdflatex -o diagram.pdf diagram.asy >&2
    ;;
  *) echo 'Unsupported diagram language' >&2; exit 1 ;;
esac
test -f diagram.pdf
# Bounded first-page rasterization prevents active SVG/PDF content reaching the browser.
pdftoppm -f 1 -singlefile -scale-to 2048 -png diagram.pdf result >&2
test -f result.png
cat result.png
