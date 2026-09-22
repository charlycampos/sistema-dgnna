FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# UTF-8 para leer tablas Access con tildes (p. ej. "Perú población INEI 2015")
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# mdbtools es OPCIONAL: se intenta instalar por HTTPS; si la red lo bloquea, el servicio
# usa el lector en Python puro (infrastructure/vendor/access_parser_dgnna), que da el mismo resultado.
RUN (sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/*.sources 2>/dev/null; \
     apt-get update && apt-get install -y --no-install-recommends mdbtools) \
    || echo "AVISO: mdbtools no disponible; se usará el lector Python de Access." ; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8014

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8014"]
