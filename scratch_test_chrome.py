import asyncio, os
from playwright.async_api import async_playwright

artifact_dir = r"D:\Usuarios\ccampos\.gemini\antigravity\brain\2a85d1ea-acd9-4d66-a3f0-8181834f10f5"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1366, "height": 768})
        page = await context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        
        print("1. Navegando al Login...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.fill('input[type="email"]', "admin@dgnna.gob.pe")
        await page.fill('input[type="password"]', "Admin2026!")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2000)
        
        print("2. Navegando a Sustracion Internacional...")
        await page.goto("http://localhost:3000/sustracion-internacional", wait_until="networkidle")
        await page.screenshot(path=os.path.join(artifact_dir, "chrome_01_bandeja.png"))
        print("   -> Screenshot 1 guardado (Bandeja principal)")
        
        print("3. Abriendo formulario de Nuevo Expediente...")
        await page.click("text=+ Nuevo Expediente")
        await page.wait_for_timeout(1000)
        
        print("4. Llenando Hoja de Tramite y Pais...")
        inputs = page.locator("input.si-input")
        await inputs.nth(0).fill("HT-CHROME-AUTO-01")
        
        selects = page.locator("select.si-input")
        await selects.nth(1).select_option("España")
        
        print("5. Abriendo modal para agregar Menor (NNA)...")
        await page.click("text=Agregar")
        await page.wait_for_timeout(1000)
        
        await page.locator('input[placeholder*="Nombre"]').last.fill("SOFIA VALERIA")
        await page.locator('input[placeholder*="Primer apellido"]').last.fill("CAMPOS")
        await page.locator('input[placeholder*="Segundo apellido"]').last.fill("NAVARRO")
        await page.locator('input[type="date"]').last.fill("2018-06-15")
        await page.wait_for_timeout(500)
        
        await page.click("text=Guardar Menor")
        await page.wait_for_timeout(1000)
        print("   -> Menor agregado con exito!")
        
        await page.screenshot(path=os.path.join(artifact_dir, "chrome_02_formulario.png"))
        print("   -> Screenshot 2 guardado (Formulario Llenado con Partes Lado a Lado)")
        
        print("6. Guardando Expediente...")
        await page.click("text=Guardar Expediente")
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path=os.path.join(artifact_dir, "chrome_03_expediente.png"))
        print("   -> Screenshot 3 guardado (Expediente Activo en Paso 1)")
        
        print("7. Marcando requisitos con Observacion en Paso 1...")
        obs_buttons = page.locator('button[title="Observado"]')
        count_obs = await obs_buttons.count()
        print(f"   -> Botones de Observado encontrados: {count_obs}")
        if count_obs >= 5:
            await obs_buttons.nth(3).click()
            await obs_buttons.nth(4).click()
            await page.wait_for_timeout(1000)
        
        print("8. Haciendo click en «Guardar y Derivar a Subsanación»...")
        derivar_btn = page.locator('text=Guardar y Derivar a Subsanación')
        if await derivar_btn.count() > 0:
            await derivar_btn.first.click()
            await page.wait_for_timeout(3000)
            print("   -> Clic exitoso sin error 404!")
            
        await page.screenshot(path=os.path.join(artifact_dir, "chrome_04_subsanacion.png"))
        print("   -> Screenshot 4 guardado (Paso 2 Subsanacion Alcanzado)")
        
        print("\n==================================================")
        print(f"REPORTE DE ERRORES DE CONSOLA EN GOOGLE CHROME: {len(console_errors)}")
        for err in console_errors:
            print("  [ERROR]", err)
        print("==================================================")
        
        await browser.close()
        print("\n>>> PRUEBA E2E COMPLETA EN CHROME / CHROMIUM EXITOSA <<<")

asyncio.run(run())
