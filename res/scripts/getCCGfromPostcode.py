import urllib.request
import json
# Get each postcode in file
from pprint import pprint

with open('rawcodes.txt') as f:
    content = f.readlines()
# you may also want to remove whitespace characters like `\n` at the end of each line

content = [x.strip() for x in content] 
codes = ['codes']

# lookup the CCG name for postcode
for pcode in content: 
   # print(pcode)
    tUrl = "http://api.postcodes.io/postcodes/"+pcode
    #print(tUrl)
    
    jsonret = urllib.request.urlopen("http://api.postcodes.io/postcodes/"+pcode).read()
    data  = json.loads(jsonret)
#    print(data)
    print(data["result"]["codes"]["ccg"])
    codes.append(data["result"]["codes"]["ccg"])


with open('filename.txt', 'w') as f:
    f.write('\n'.join(codes))