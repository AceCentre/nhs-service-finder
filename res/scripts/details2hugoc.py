from csv import reader, writer
from codecs import open
from sys import argv, stderr
import argparse
import re
import os.path
import operator
from functools import reduce

# Run this like python details2hugoc.py ../data/service-wcs-ccg.csv ../data/service-wcs-details.csv --dest ../data/somedata/


parser = argparse.ArgumentParser(description='Service/Detail csv files.')
parser.add_argument('files', metavar='N', type=str, nargs='+',
                    help='services/details, filename should have this format, service-<name>-[ccg/details].csv')
parser.add_argument('--dest', type=str,
                    help='sum the integers (default: find the max)')

args = parser.parse_args()

fn_template = "{Service ID}.md"
aac_md_template = """---
title: {Service Name}
serviceid: {Service ID}
servicename: {Service Name}
caseload: {Caseload eg adults/children}
contactphone: {Enquiries Contact - phone}
email: {Enquiries Contact - email}
website: {Website}
cm_listing_link: {CM Listing Link}
note: "{Notes}"
ccgservices:
{ccgservices}
ccgcodes:
{ccgcodes}
---

{{{{< ccg_service_detail >}}}}
"""

ec_md_template = """---
title: {Service Name}
serviceid: {Service ID}
servicename: {Service Name}
contactphone: {Telephone}
email: {Email}
website: {Website}
address: "{Address}"
note: "{Notes}"
ccgservices:
{ccgservices}
ccgcodes:
{ccgcodes}
---

{{{{< ccg_service_detail >}}}}
"""

wcs_md_template = """---
title: {Service Name}
serviceid: {Service ID}
servicename: {Service Name}
contactphone: {Enquiries Contact - phone}
email: {Enquiries Contact - email}
website: {URL}
address: "{Address} {postcode}"
ccgservices:
{ccgservices}
ccgcodes:
{ccgcodes}
---

{{{{< ccg_service_detail >}}}}
"""

md_templates = {
  "aac": aac_md_template,
  "ec": ec_md_template,
  "wcs": wcs_md_template
}

type_priority = [ "aac", "ec", "wcs" ]

if __name__ == '__main__':
  # usage: <csvtworow-file> <dist>
  # csvtworow as first argument
  # distcsv as second
  allservices = {}
  alldetails = {}
  contents_data = {}
  for fn in args.files:
    basename = os.path.basename(fn)
    match = re.match(r"^service-([^\-]+)-([^\.]+).csv", basename, re.IGNORECASE)
    if match != None:
       name = match.group(1)
       if match.group(2) == "ccg":
        with open(fn, 'r') as f:
          rows = list(reader(f))
          if len(rows) < 2:
            raise ValueError("Expecting more than one row in input file")
          fields = list(map(lambda a: a.replace("(", "").replace(")", "").replace(".", ""), rows[0]))
          records = []
          for row in rows[1:]:
            record = {}
            for i in range(len(fields)):
              record[fields[i]] = row[i] if len(row) > i else ""
            records.append(record)
          allservices[name] = records
       elif match.group(2) == "details":
        alldetails[name] = fn

  # write content
  for _servicename, fn in alldetails.items():
    with open(fn, 'r') as f:
      inputrows = list(reader(f))
      if len(inputrows) < 2:
        raise ValueError("Expecting more than one row in input file")
      fields = list(map(lambda a: a.replace("(", "").replace(")", "").replace(".", ""), inputrows[0]))
      for inputrow in inputrows[1:]:
        row = {}
        for i in range(len(fields)):
          row[fields[i]] = inputrow[i] if len(inputrow) > i else ""
        sid = row['Service ID']
        if sid != None and len(sid) == 0:
          continue
        ccgservices = list( \
          map(lambda a:a[0], \
              filter(lambda a: \
                       len(filter(lambda b:b['Service ID']==sid,a[1])) > 0 \
                     , allservices.items())) \
        )
        ccgcodes = set( \
          map(lambda a:a['CCG17CD'], \
              filter(lambda a:a['Service ID']==sid, \
                     reduce(operator.add, allservices.values()))) \
        )
        row['ccgservices'] = "\n".join(map(lambda a:"  - "+a, ccgservices)).lower()
        row['ccgcodes'] = "\n".join(map(lambda a:"  - "+a, ccgcodes)).lower()
        row['_servicename'] = _servicename
        row['_type_priority'] = type_priority.index(_servicename)
        prevrow = contents_data.get(sid, None)
        if prevrow == None or prevrow['_type_priority'] > row['_type_priority']:
          contents_data[sid] = row
      
    for row in contents_data.values():
      with open("{0}/{1}".format(args.dest, fn_template.format(**row).lower()), 'w') as wf:
        try:
          wf.write(md_templates[row['_servicename']].format(**row))
        except:
          print("csv file: " + fn + " , " + row['Service ID'])
          raise


