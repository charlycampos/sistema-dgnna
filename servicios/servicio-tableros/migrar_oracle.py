import sqlite3
import oracledb

def main():
    s_conn = sqlite3.connect('tableros.db')
    s_cur = s_conn.cursor()
    s_cur.execute('''
        SELECT id, codigo_direccion, titulo, subtitulo, tipo, url_embed, descripcion, responsable, estado, orden, activo, es_personalizado
        FROM tableros_direccion
    ''')
    rows = s_cur.fetchall()
    
    o_conn = oracledb.connect(user='tableros_db', password='Tableros2026', dsn='host.docker.internal:1521/XEPDB1')
    o_cur = o_conn.cursor()
    o_cur.execute('DELETE FROM tableros_direccion')
    o_conn.commit()

    insert_sql = '''
        INSERT INTO tableros_direccion 
        (id, codigo_direccion, titulo, subtitulo, tipo, url_embed, descripcion, responsable, estado, orden, activo, es_personalizado, creado_en)
        VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, SYSTIMESTAMP)
    '''
    
    for r in rows:
        vals = list(r)
        # Update DPNNA items 3 and 4 to powerbi / activo if needed
        if vals[0] in ('dpnna-encuestas-nacionales', 'dpnna-registros-administrativos'):
            vals[4] = 'powerbi'
            vals[8] = 'activo'
        o_cur.execute(insert_sql, vals)

    o_conn.commit()
    print('Migración a Oracle completa. Total filas migradas:', len(rows))

if __name__ == '__main__':
    main()
