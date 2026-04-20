from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/tos-check', methods=['GET'])
def check_tos():
    # Burada uygulamanın beklediği cevabı simüle edebilirsin
    return jsonify({
        "status": "success",
        "accepted": True,
        "version": "1.2.3"
    })

if __name__ == '__main__':
    # Sunucuyu yerel ağda başlatır
    app.run(host='127.0.0.1', port=5000)