import jwt
payload = {"test": "value"}
token = jwt.encode(payload, "secret", algorithm="HS256")
print("Token:", token)