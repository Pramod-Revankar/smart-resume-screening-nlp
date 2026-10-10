import joblib, pandas as pd, numpy as np, warnings, json
warnings.filterwarnings("ignore")
from sklearn.model_selection import train_test_split
from sklearn.metrics import *
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import calibration_curve
from xgboost import XGBClassifier
M="ml/models/"
model=joblib.load(M+"final/resume_selection_model.pkl"); pre=joblib.load(M+"encoders/resume_preprocessor.pkl"); le=joblib.load(M+"encoders/label_encoder.pkl")
df=pd.read_csv("ml/datasets/raw/resume_screening_dataset.csv")
X=df.drop(columns=["selected","candidate_id"]); y=le.transform(df["selected"])
Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=0.2,random_state=42,stratify=y)
Ete=pre.transform(Xte); pte=model.predict_proba(Ete)[:,1]

# 0. how many dataset rows would the OLD API schema reject (kaggle must be int)?
print("rows with fractional kaggle score (old API 422):", round((df.kaggle_activity_score%1!=0).mean()*100,1),"%")

# 1. threshold selection on a VALIDATION split (tr/val from train), model refit on tr only with identical hyperparams -> no test leakage
Xt2,Xv,yt2,yv=train_test_split(Xtr,ytr,test_size=0.2,random_state=42,stratify=ytr)
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
cats=['gender','degree','specialization','university_tier','location']
pre2=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cats)],remainder='passthrough'); Et2=pre2.fit_transform(Xt2); Ev=pre2.transform(Xv)
m2=XGBClassifier(n_estimators=300,max_depth=6,learning_rate=0.05,subsample=0.8,colsample_bytree=0.8,random_state=42,eval_metric="logloss").fit(Et2,yt2)
pv=m2.predict_proba(Ev)[:,1]
def row(p,y,t):
    pr=(p>=t).astype(int); tn,fp,fn,tp=confusion_matrix(y,pr).ravel()
    return dict(t=t,acc=accuracy_score(y,pr),prec=precision_score(y,pr),rec=recall_score(y,pr),f1=f1_score(y,pr),fp=int(fp),fn=int(fn))
print("\nTHRESHOLD (validation, refit-on-train-subset)      |  TEST (saved model)")
for t in [0.3,0.4,0.45,0.5,0.55,0.6,0.7,0.8]:
    a=row(pv,yv,t); b=row(pte,yte,t)
    print(f" t={t:.2f} val: P{a['prec']:.3f} R{a['rec']:.3f} F1{a['f1']:.3f} FP{a['fp']:4d} FN{a['fn']:4d} | test: acc{b['acc']:.3f} P{b['prec']:.3f} R{b['rec']:.3f} F1{b['f1']:.3f} FP{b['fp']:4d} FN{b['fn']:4d}")
ts=np.linspace(0.2,0.8,61); best=max(ts,key=lambda t:f1_score(yv,(pv>=t).astype(int)))
print("F1-optimal threshold on validation:",round(best,2),"  F1 gain vs 0.50 on val:",round(f1_score(yv,(pv>=best).astype(int))-f1_score(yv,(pv>=.5).astype(int)),4))

# 2. calibration (test, saved model)
fr,mp=calibration_curve(yte,pte,n_bins=10,strategy="quantile")
print("\nCALIBRATION test (mean predicted -> observed positive rate), 10 quantile bins")
for a,b in zip(mp,fr): print(f"  {a:.3f} -> {b:.3f}")
ece=np.mean(np.abs(fr-mp)); print("ECE(approx)",round(ece,4),"Brier",round(brier_score_loss(yte,pte),4),"logloss",round(log_loss(yte,pte),4))
print("share of test preds >=0.90:",round((pte>=.9).mean()*100,1),"%, observed pos rate there:",round(yte[pte>=.9].mean(),3),"| preds >=0.99:",round((pte>=.99).mean()*100,1),"%")

# 3. leakage / synthetic-target check
print("\nLEAKAGE / SYNTHETIC check")
num=X.select_dtypes('number').columns.tolist()
lr=LogisticRegression(max_iter=3000); 
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
for feats in (["expected_salary_lpa"],["python_skill"],["expected_salary_lpa","python_skill","years_experience","projects_count","cgpa"],num):
    pp=make_pipeline(StandardScaler(),LogisticRegression(max_iter=3000)).fit(Xtr[feats],ytr); 
    print(f"  LogReg on {len(feats)} numeric feat {feats if len(feats)<6 else '(all 17 numeric)'}: test AUC",round(roc_auc_score(yte,pp.predict_proba(Xte[feats])[:,1]),4))
print("  Correlation of each numeric feature with target (Pearson):")
c=pd.concat([X[num],pd.Series(y,name='y',index=X.index)],axis=1).corr()['y'].drop('y').sort_values(key=abs,ascending=False); print("  ",c.round(3).head(8).to_dict())
lr_all=make_pipeline(StandardScaler(),LogisticRegression(max_iter=3000)).fit(Xtr[num],ytr)
print("  -> a plain linear model on numeric cols reaches AUC",round(roc_auc_score(yte,lr_all.predict_proba(Xte[num])[:,1]),4),"vs XGBoost",round(roc_auc_score(yte,pte),4),": target is largely a (noisy) linear score of the numeric features = synthetic generation signature")

# 4. protected-attribute sensitivity: flip gender / shift age on test set, same model
base=pte
for col,vals in (("gender",["Male","Female","Non-Binary"]),):
    outs={}
    for v in vals:
        Z=Xte.copy(); Z[col]=v; outs[v]=model.predict_proba(pre.transform(Z))[:,1]
    print("\nFAIRNESS probe: mean P(selected) if every test candidate were labelled:",{k:round(float(v.mean()),4) for k,v in outs.items()},
          "| max per-candidate |Δp| across gender:",round(float(np.max(np.abs(np.vstack(list(outs.values())).max(0)-np.vstack(list(outs.values())).min(0)))),4))
print("selection rate in data by gender:",df.groupby('gender').selected.apply(lambda s:round((s=='Yes').mean(),3)).to_dict())
Z=Xte.copy(); Z["age"]=Z["age"].clip(upper=29); Za=model.predict_proba(pre.transform(Z))[:,1]
Z2=Xte.copy(); Z2["age"]=40; print("mean P if age forced 24 vs 40:",round(float(model.predict_proba(pre.transform(Xte.assign(age=24)))[:,1].mean()),4),round(float(model.predict_proba(pre.transform(Z2))[:,1].mean()),4))
json.dump(dict(val_threshold_best=float(best)),open("/home/claude/work/thr.json","w"))
