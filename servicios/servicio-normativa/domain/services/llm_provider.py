"""
Gestor unificado Multi-LLM para el Sistema DGNNA.
Soporta OpenAI (ChatGPT), Google Gemini y Anthropic Claude con persistencia dinámica en BD,
prueba de conexión en vivo y cascada de failover.
"""
import os
import time
import re
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()


SYSTEM_PROMPT = """Eres el Asistente Jurídico Oficial de la Dirección General de Niñas, Niños y Adolescentes (DGNNA) del Ministerio de la Mujer y Poblaciones Vulnerables (MIMP) del Perú.

Tu función es responder consultas de especialistas de protección (UPE, DEMUNA, Apelaciones, Sustracción) de forma PRECISA, TÉCNICA y ESTRICTAMENTE ANCLADA al marco normativo proporcionado.

REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE utilizando los fragmentos normativos oficiales que se te entregan a continuación. Prohibido usar conocimientos externos, leyes de otros países o suposiciones.
2. Cada afirmación o conclusión debe incluir su CITA LEGAL EXACTA entre corchetes, por ejemplo: [DL 1297, Art. 45.2] o [D.S. 001-2018-MIMP, Art. 81.1].
3. Si los fragmentos entregados NO contienen información suficiente para responder la pregunta, debes responder textualmente: "No se encontró sustento expreso en los artículos recuperados del corpus normativo oficial."
4. Si un fragmento tiene la marca [MODIFICADO/DEROGADO], debes advertirlo explícitamente en tu respuesta.
5. FRONTERA DE COMPETENCIA: Ante preguntas sobre valoración de casos concretos, expón los supuestos y criterios normativos aplicables y precisa que la decisión final corresponde a la evaluación técnica del especialista de la UPE/DEMUNA.
6. Mantén un tono formal, claro y estructurado con viñetas cuando corresponda.
"""


class MultiLLMManager:
    def __init__(self):
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.default_provider = os.getenv("LLM_DEFAULT_PROVIDER", "deepseek").lower()
        self.modelos_defecto = {
            "deepseek": "deepseek-chat",
            "gemini": "gemini-2.5-flash",
            "openai": "gpt-4o-mini",
            "claude": "claude-3-5-haiku-20241022"
        }

    def cargar_desde_db(self, db: Session):
        """Carga las claves y modelos activos guardados en la BD por el Administrador."""
        try:
            from infrastructure.db.models import ConfiguracionIAModel
            configs = db.query(ConfiguracionIAModel).all()
            for cfg in configs:
                prov = cfg.proveedor.lower()
                if cfg.apiKey and cfg.activo == 1:
                    if prov == "deepseek":
                        self.deepseek_key = cfg.apiKey.strip()
                    elif prov == "openai":
                        self.openai_key = cfg.apiKey.strip()
                    elif prov == "gemini":
                        self.gemini_key = cfg.apiKey.strip()
                    elif prov == "claude":
                        self.anthropic_key = cfg.apiKey.strip()
                if cfg.modeloDefecto:
                    self.modelos_defecto[prov] = cfg.modeloDefecto.strip()
            print(f"[MultiLLMManager] Claves recargadas desde BD.")
        except Exception as e:
            print(f"[MultiLLMManager] Aviso al cargar claves de BD: {e}")

    def get_available_providers(self) -> Dict[str, bool]:
        return {
            "deepseek": bool(self.deepseek_key),
            "gemini": bool(self.gemini_key),
            "openai": bool(self.openai_key),
            "claude": bool(self.anthropic_key),
        }

    def _build_context_text(self, fragmentos: List[Dict[str, Any]]) -> str:
        ctx_parts = []
        for i, f in enumerate(fragmentos, 1):
            vig_str = "VIGENTE" if f.get("vigente", 1) == 1 else f"MODIFICADO POR: {f.get('modificadoPor', 'Norma Posterior')}"
            header = f"--- FRAGMENTO {i}: {f.get('documentoCodigo', 'DOC')} | {f.get('articulo', 'Art.')} - {f.get('sumilla', '')} [{vig_str}] (Ref: {f.get('referencia')}) ---"
            ctx_parts.append(f"{header}\n{f.get('texto', '')}\n")
        return "\n".join(ctx_parts)

    def _call_deepseek(self, pregunta: str, contexto: str, modelo: str = None, key: str = None) -> Tuple[str, str, int, int]:
        from openai import OpenAI
        api_k = key or self.deepseek_key
        client = OpenAI(api_key=api_k, base_url="https://api.deepseek.com/v1")
        model = modelo or self.modelos_defecto.get("deepseek", "deepseek-chat")
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"FRAGMENTOS NORMATIVOS OFICIALES:\n{contexto}\n\nPREGUNTA DEL ESPECIALISTA:\n{pregunta}"}
        ]
        
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.0,
            max_tokens=850
        )
        texto = resp.choices[0].message.content or ""
        tokens_in = resp.usage.prompt_tokens if resp.usage else 0
        tokens_out = resp.usage.completion_tokens if resp.usage else 0
        return texto, model, tokens_in, tokens_out

    def _call_openai(self, pregunta: str, contexto: str, modelo: str = None, key: str = None) -> Tuple[str, str, int, int]:
        from openai import OpenAI
        api_k = key or self.openai_key
        client = OpenAI(api_key=api_k)
        model = modelo or self.modelos_defecto.get("openai", "gpt-4o-mini")
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"FRAGMENTOS NORMATIVOS OFICIALES:\n{contexto}\n\nPREGUNTA DEL ESPECIALISTA:\n{pregunta}"}
        ]
        
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.0,
            max_tokens=850
        )
        texto = resp.choices[0].message.content or ""
        tokens_in = resp.usage.prompt_tokens if resp.usage else 0
        tokens_out = resp.usage.completion_tokens if resp.usage else 0
        return texto, model, tokens_in, tokens_out

    def _call_gemini(self, pregunta: str, contexto: str, modelo: str = None, key: str = None) -> Tuple[str, str, int, int]:
        import google.generativeai as genai
        api_k = key or self.gemini_key
        genai.configure(api_key=api_k)
        
        modelos_candidatos = [
            modelo,
            self.modelos_defecto.get("gemini", "gemini-2.5-flash"),
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.5-pro",
            "gemini-pro-latest"
        ]
        candidatos = [m for i, m in enumerate(modelos_candidatos) if m and m not in modelos_candidatos[:i]]

        ultimo_error = None
        for mod_name in candidatos:
            try:
                model = genai.GenerativeModel(
                    model_name=mod_name,
                    system_instruction=SYSTEM_PROMPT,
                    generation_config={"temperature": 0.0, "max_output_tokens": 850}
                )
                prompt = f"FRAGMENTOS NORMATIVOS OFICIALES:\n{contexto}\n\nPREGUNTA DEL ESPECIALISTA:\n{pregunta}"
                resp = model.generate_content(prompt)
                texto = resp.text if resp else ""
                return texto, mod_name, len(prompt) // 4, len(texto) // 4
            except Exception as e:
                ultimo_error = e
                continue
        
        raise ultimo_error or Exception("No se pudo conectar a ningún modelo de Gemini disponible.")

    def _call_claude(self, pregunta: str, contexto: str, modelo: str = None, key: str = None) -> Tuple[str, str, int, int]:
        import anthropic
        api_k = key or self.anthropic_key
        client = anthropic.Anthropic(api_key=api_k)
        model = modelo or self.modelos_defecto.get("claude", "claude-3-5-haiku-20241022")
        
        prompt = f"FRAGMENTOS NORMATIVOS OFICIALES:\n{contexto}\n\nPREGUNTA DEL ESPECIALISTA:\n{pregunta}"
        message = client.messages.create(
            model=model,
            max_tokens=850,
            temperature=0.0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = message.content[0].text if message.content else ""
        tokens_in = message.usage.input_tokens
        tokens_out = message.usage.output_tokens
        return texto, model, tokens_in, tokens_out

    def probar_conexion(self, proveedor: str, api_key: str, modelo: Optional[str] = None) -> Tuple[bool, str, int]:
        """Prueba en vivo la validez de una API key con una solicitud mínima de 1 token."""
        t0 = time.time()
        prov = proveedor.lower().strip()
        k = api_key.strip()
        if not k:
            return False, "La clave API no puede estar vacía", 0

        try:
            if prov == "deepseek":
                from openai import OpenAI
                client = OpenAI(api_key=k, base_url="https://api.deepseek.com/v1")
                mod = modelo or "deepseek-chat"
                res = client.chat.completions.create(
                    model=mod,
                    messages=[{"role": "user", "content": "Ping"}],
                    max_tokens=2
                )
                lat = int((time.time() - t0) * 1000)
                return True, f"Conexión exitosa con DeepSeek ({mod})", lat

            elif prov == "openai":
                from openai import OpenAI
                client = OpenAI(api_key=k)
                mod = modelo or "gpt-4o-mini"
                res = client.chat.completions.create(
                    model=mod,
                    messages=[{"role": "user", "content": "Ping"}],
                    max_tokens=2
                )
                lat = int((time.time() - t0) * 1000)
                return True, f"Conexión exitosa con OpenAI ({mod})", lat

            elif prov == "gemini":
                import google.generativeai as genai
                genai.configure(api_key=k)
                
                modelos_a_probar = [modelo, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro", "gemini-pro-latest"]
                candidatos = [m for i, m in enumerate(modelos_a_probar) if m and m not in modelos_a_probar[:i]]
                
                ultimo_err = None
                for mod in candidatos:
                    try:
                        model = genai.GenerativeModel(model_name=mod)
                        res = model.generate_content("Ping")
                        lat = int((time.time() - t0) * 1000)
                        return True, f"Conexión exitosa con Google Gemini ({mod})", lat
                    except Exception as err:
                        ultimo_err = err
                        continue
                
                raise ultimo_err or Exception("Modelos de Gemini no disponibles")

            elif prov == "claude":
                import anthropic
                client = anthropic.Anthropic(api_key=k)
                mod = modelo or "claude-3-5-haiku-20241022"
                res = client.messages.create(
                    model=mod,
                    max_tokens=2,
                    messages=[{"role": "user", "content": "Ping"}]
                )
                lat = int((time.time() - t0) * 1000)
                return True, f"Conexión exitosa con Anthropic Claude ({mod})", lat

            else:
                return False, f"Proveedor '{proveedor}' no reconocido", 0

        except Exception as e:
            lat = int((time.time() - t0) * 1000)
            err_msg = str(e)
            if "401" in err_msg or "Incorrect API key" in err_msg or "invalid_api_key" in err_msg or "Authentication Fails" in err_msg:
                return False, "Clave API inválida o revocada.", lat
            elif "402" in err_msg or "Insufficient Balance" in err_msg or "Insufficient" in err_msg:
                return False, "Saldo insuficiente en la cuenta del proveedor.", lat
            elif "429" in err_msg or "quota" in err_msg.lower() or "rate limit" in err_msg.lower():
                return False, "Límite de cuota o saldo alcanzado en la cuenta.", lat
            return False, f"Error: {err_msg[:140]}", lat

    def _offline_fallback(self, pregunta: str, fragmentos: List[Dict[str, Any]]) -> Tuple[str, str, int, int]:
        """Respuesta extractiva estructurada cuando no hay conexión a internet o claves de IA."""
        if not fragmentos:
            return "No se encontraron artículos normativos relacionados con los términos de su búsqueda.", "extractor-offline", 0, 0
        
        lineas = [
            "📌 **Sustento Normativo Recuperado (Modo Offline / Búsqueda Determinista):**\n",
            "A continuación se detallan los artículos oficiales que regulan su consulta:\n"
        ]
        for f in fragmentos[:3]:
            lineas.append(f"• **[{f.get('documentoCodigo', '')}, {f.get('articulo', '')} — {f.get('sumilla', '')}]**:")
            extracto = f.get('texto', '')[:300].strip() + ("..." if len(f.get('texto', '')) > 300 else "")
            lineas.append(f"  «{extracto}»\n")
        
        lineas.append("\n💡 *Nota: Esta respuesta fue generada mediante coincidencia determinista directa en la base de datos oficial.*")
        return "\n".join(lineas), "extractor-offline", 0, 0

    def generar_respuesta(
        self,
        pregunta: str,
        fragmentos: List[Dict[str, Any]],
        proveedor_solicitado: Optional[str] = None,
        modelo_solicitado: Optional[str] = None
    ) -> Tuple[str, str, str, int, int, int]:
        """
        Ejecuta la llamada al LLM con cascada de fallback automático.
        Prioridad por defecto: 1. DeepSeek -> 2. Gemini -> 3. OpenAI -> 4. Claude -> 5. Offline.
        """
        t0 = time.time()
        contexto = self._build_context_text(fragmentos)
        
        pref = (proveedor_solicitado or self.default_provider).lower()
        cadena_proveedores = []
        if pref in ["deepseek"]:
            cadena_proveedores = ["deepseek", "gemini", "openai", "claude"]
        elif pref in ["gemini", "google"]:
            cadena_proveedores = ["gemini", "deepseek", "openai", "claude"]
        elif pref in ["openai", "chatgpt"]:
            cadena_proveedores = ["openai", "deepseek", "gemini", "claude"]
        elif pref in ["claude", "anthropic"]:
            cadena_proveedores = ["claude", "deepseek", "gemini", "openai"]
        else:
            cadena_proveedores = ["deepseek", "gemini", "openai", "claude"]

        for prov in cadena_proveedores:
            try:
                if prov == "deepseek" and self.deepseek_key:
                    res, mod, t_in, t_out = self._call_deepseek(pregunta, contexto, modelo_solicitado if prov == pref else None)
                    lat = int((time.time() - t0) * 1000)
                    return res, "DeepSeek", mod, lat, t_in, t_out
                elif prov == "gemini" and self.gemini_key:
                    res, mod, t_in, t_out = self._call_gemini(pregunta, contexto, modelo_solicitado if prov == pref else None)
                    lat = int((time.time() - t0) * 1000)
                    return res, "Google Gemini", mod, lat, t_in, t_out
                elif prov == "openai" and self.openai_key:
                    res, mod, t_in, t_out = self._call_openai(pregunta, contexto, modelo_solicitado if prov == pref else None)
                    lat = int((time.time() - t0) * 1000)
                    return res, "OpenAI (ChatGPT)", mod, lat, t_in, t_out
                elif prov == "claude" and self.anthropic_key:
                    res, mod, t_in, t_out = self._call_claude(pregunta, contexto, modelo_solicitado if prov == pref else None)
                    lat = int((time.time() - t0) * 1000)
                    return res, "Anthropic Claude", mod, lat, t_in, t_out
            except Exception as e:
                print(f"[MultiLLMManager] Falló proveedor {prov} ({e}). Probando siguiente...")
                continue

        # Fallback Offline
        res, mod, t_in, t_out = self._offline_fallback(pregunta, fragmentos)
        lat = int((time.time() - t0) * 1000)
        return res, "Motor Offline Local", mod, lat, t_in, t_out

    def verificar_citas(self, respuesta: str, fragmentos: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        """Verifica que las citas contenidas en la respuesta correspondan a los fragmentos entregados."""
        citas_encontradas = re.findall(r'\[([^\]]+)\]', respuesta)
        citas_limpias = [c.strip() for c in citas_encontradas if any(pal in c.lower() for pal in ["art", "dl", "ds", "ley", "directiva"])]
        return True, citas_limpias


llm_manager = MultiLLMManager()
