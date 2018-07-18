from csv import reader, writer
from codecs import open
from sys import argv, stderr

if __name__ == '__main__':
  # usage: <csvtworow-file> <dist>
  # csvtworow as first argument
  # distcsv as second
  if len(argv) != 3:
    print("Usage: {0} <csvtworow-file> <dist>".format(argv[0]), file=stderr)
    exit(-1)
  with open(argv[1], 'r') as f:
    with open(argv[2], 'w') as wf:
      csvtworow = list(reader(f))
      if len(csvtworow) != 2:
        raise ValueError("Expecting two row in input file")
      if len(csvtworow[0]) != len(csvtworow[1]):
        raise ValueError("Expecting input file has equal amount of columns")
      outwriter = writer(wf)
      for a in zip(csvtworow[0], csvtworow[1]):
        outwriter.writerow(a)
    
