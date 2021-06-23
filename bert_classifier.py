import torch
import transformers
from torch import nn
import sys
from transformers import BertModel

def process_text(text):
    lines = text.split("\n")
    clean_text = " ".join(str(x.replace(u'\xa0', u' ')) for x in lines if x)
    return clean_text

MAX_LEN = 400

class AbstractClassifier(nn.Module):
    def __init__(self, n_classes):
        super(AbstractClassifier, self).__init__()
        self.bert = BertModel.from_pretrained('bert-base-cased')
        self.drop = nn.Dropout(p=0.3)
        self.out = nn.Linear(self.bert.config.hidden_size, n_classes)
        self.softmax = nn.Softmax(dim=1)
    
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )

        output = self.drop(outputs[1])
        output = self.out(output)
        return self.softmax(output)


def classify(text, clf):

    tokenizer = transformers.BertTokenizer.from_pretrained('bert-base-cased')

    encoded_review = tokenizer.encode_plus(
    text,
    max_length=MAX_LEN,
    truncation=True,
    add_special_tokens=True,
    return_token_type_ids=False,
    padding=True,
    return_attention_mask=True,
    return_tensors='pt',
    )

    input_ids = encoded_review['input_ids']
    attention_mask = encoded_review['attention_mask']

    output = clf(input_ids, attention_mask)

    prob, prediction = torch.max(output, dim=1)

    class_names = ['Not abstract', 'abstract']

    print(prob.item())
    print(class_names[prediction])

if __name__ == '__main__':
    text = sys.argv[1]
    cleaned_text = process_text(text)
    clf = torch.load('model.pth', map_location='cpu')
    classify(cleaned_text, clf)

