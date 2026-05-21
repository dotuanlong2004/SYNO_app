import sqlite3
conn = sqlite3.connect('./agent-buffer.sqlite')
conn.execute("UPDATE local_logs SET is_synced=0 WHERE enroll_number='3'")
conn.commit()
print('Reset', conn.total_changes, 'rows')
conn.close()
