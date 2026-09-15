# Sizma Testi & SOC L1 Entegrasyon Araci

Nuclei / OpenVAS / Nessus tarama ciktilarini normalize edip tek bir veritabaninda
toplayan, host+CVE imzasina gore benzer bulgulari bir "Alert" altinda birlestiren
ve bu alertleri bir SOC L1 triage kuyrugunda (durum + atama + not) isleyen
FastAPI + React uygulamasi.

## Mimari

- `backend/` - FastAPI + SQLAlchemy + SQLite. Parser'lar (`app/parsers/`) her
  aracin ciktisini ortak bir `Finding` seklinde normalize eder. `app/correlation.py`
  host+CVE (veya host+baslik) imzasina gore ayni sorunu tekrar tekrar alert
  olarak cogaltmadan mevcut alerte ekler.
- `frontend/` - Vite + React. Panel (ozet sayilar), Triage Kuyrugu, Bulgular
  listesi, Rapor Yukle sayfalari.

## Kali VM uzerinde kurulum

VM'e SSH ile baglandiktan sonra:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm
```

Projeyi Windows makinesinden VM'e kopyala (Windows'ta OpenSSH client kurulu,
bu komutu Windows PowerShell'de calistir):

```powershell
scp -r "C:\Users\ahmet\Documents\sızma testi - güvenlik tarama raporlama aracı" kullanici@VM_IP:~/soc-tool
```

VM'de backend'i kur ve calistir:

```bash
cd ~/soc-tool/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Ayni VM'de yeni bir terminalde frontend'i kur ve calistir:

```bash
cd ~/soc-tool/frontend
npm install
npm run dev -- --host 0.0.0.0
```

Tarayicidan `http://VM_IP:5173` adresine git. Backend farkli bir hostta/portta
calisiyorsa `frontend/.env` dosyasina `VITE_API_BASE=http://VM_IP:8000` ekle.

### Tarama araclarini VM'e kurma (opsiyonel)

```bash
# Nuclei (Go gerektirir)
sudo apt install -y golang-go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
~/go/bin/nuclei -u https://hedef.com -jsonl -o scan.jsonl

# OpenVAS / Greenbone (GVM) - Kali'de genelde onceden kurulu
sudo gvm-setup
sudo gvm-start
# Tarama tamamlandiktan sonra GSA arayuzunden "XML" formatinda rapor indir

# Nessus - Tenable'dan .deb indirip kur, sonra web arayuzunden
# "Nessus" (.nessus) formatinda export al
```

Cikan `scan.jsonl` / OpenVAS XML / `.nessus` dosyasini uygulamanin "Rapor Yukle"
sayfasindan (veya `curl` ile asagida) ice aktar.

### Local test (Windows'ta, VM olmadan hizli deneme)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

```powershell
cd frontend
npm install
npm run dev
```

`http://localhost:5173` adresine git, backend `http://localhost:8000` adresinde
calisir.

## API'yi curl ile test etme

```bash
curl -X POST http://localhost:8000/api/imports/nuclei \
  -F "file=@sample_reports/sample_nuclei.jsonl"

curl http://localhost:8000/api/alerts
curl http://localhost:8000/api/stats/summary
```

Ornek Nuclei ciktisi `sample_reports/sample_nuclei.jsonl` dosyasinda mevcut;
1 critical (Log4Shell), 1 medium, 1 low bulgu icerir ve yuklendiginde 3 ayri
alert olusturur.

## Veri modeli ozeti

- **Finding**: tek bir tarama aracindan gelen ham bulgu (host, port, severity,
  cve, cvss, raw_data).
- **Alert**: `host + ilk CVE (yoksa baslik)` imzasina gore gruplanmis triage
  birimi. Ayni sorun farkli araclardan veya tekrar taramalardan gelirse yeni
  alert acilmaz, mevcut alerte finding eklenir ve severity en yuksek olana
  gunceller.
- **AlertNote**: analistin alerte ekledigi serbest metin not.

## Sonraki adimlar (opsiyonel)

- Kimlik dogrulama / rol bazli erisim (SOC analisti vs admin)
- Gercek zamanli SIEM/syslog alert akisi entegrasyonu (simdilik sadece dosya
  import destekleniyor)
- Ticket'lari harici sistemlere (Jira/ServiceNow) push etme
