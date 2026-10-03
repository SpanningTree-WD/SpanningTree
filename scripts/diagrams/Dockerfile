FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base texlive-latex-extra texlive-pictures texlive-fonts-recommended \
    asymptote ghostscript poppler-utils coreutils \
    && rm -rf /var/lib/apt/lists/*
COPY render.sh /usr/local/bin/render-diagram
RUN chmod 0555 /usr/local/bin/render-diagram
ENV HOME=/work TEXMFVAR=/work/texmf-var TEXMFCONFIG=/work/texmf-config openin_any=p openout_any=p shell_escape=f
USER 65534:65534
WORKDIR /work
ENTRYPOINT ["timeout", "--signal=TERM", "--kill-after=1", "25", "/usr/local/bin/render-diagram"]
