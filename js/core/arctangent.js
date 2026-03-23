// js/core/arctangent.js
// Single-matrix: Matrix arctan(A) (numeric principal series near 0)
// Uses power series: arctan(A) = Σ (-1)^k A^(2k+1)/(2k+1), valid for ||A|| < 1 (approx).
//
// To avoid misleading results, we REQUIRE ||A||_F < 1.0 (tunable via value "bound=1").
// Output: Number matrix

function looksLikeMatrix(M){return Array.isArray(M)&&M.length&&Array.isArray(M[0])&&M[0].length;}
function toNumber(x){try{return math.number(x);}catch{const v=Number(x);return Number.isFinite(v)?v:NaN;}}
function toNumberMatrix(A){const r=A.length,c=A[0].length;const out=new Array(r);for(let i=0;i<r;i++){if(!Array.isArray(A[i])||A[i].length!==c)throw new Error("Invalid matrix row length.");const row=new Array(c);for(let j=0;j<c;j++)row[j]=toNumber(A[i][j]);out[i]=row;}return out;}
function zeros(n){return Array.from({length:n},()=>Array(n).fill(0));}
function identity(n){const I=zeros(n);for(let i=0;i<n;i++)I[i][i]=1;return I;}
function add(A,B){const n=A.length,m=A[0].length;const C=new Array(n);for(let i=0;i<n;i++){const r=new Array(m);for(let j=0;j<m;j++)r[j]=A[i][j]+B[i][j];C[i]=r;}return C;}
function scale(A,s){const n=A.length,m=A[0].length;const C=new Array(n);for(let i=0;i<n;i++){const r=new Array(m);for(let j=0;j<m;j++)r[j]=A[i][j]*s;C[i]=r;}return C;}
function mul(A,B){const n=A.length,m=B[0].length,k=A[0].length;const C=new Array(n);for(let i=0;i<n;i++){const row=new Array(m).fill(0);for(let t=0;t<k;t++){const a=A[i][t];if(a===0)continue;for(let j=0;j<m;j++)row[j]+=a*B[t][j];}C[i]=row;}return C;}
function normF(A){let s=0;for(let i=0;i<A.length;i++)for(let j=0;j<A[0].length;j++){const v=A[i][j];s+=v*v;}return Math.sqrt(s);}
function cleanupNegZero(M){for(let i=0;i<M.length;i++)for(let j=0;j<M[0].length;j++)if(Object.is(M[i][j],-0))M[i][j]=0;return M;}

function parseParams(value){
  let terms=18;
  let bound=1.0;
  if(typeof value==="string"&&value.trim()){
    const parts=value.split(",").map(s=>s.trim());
    for(const p of parts){
      const [k,v]=p.split("=").map(s=>s.trim());
      const kk=(k||"").toLowerCase();
      if(kk==="terms"){const n=Number(v);if(Number.isFinite(n)&&n>=5&&n<=120)terms=Math.floor(n);}
      if(kk==="bound"){const b=Number(v);if(Number.isFinite(b)&&b>0)bound=b;}
    }
  }
  return {terms,bound};
}

function arctanSeries(A, terms){
  const n=A.length;
  let sum=zeros(n);

  // A^(2k+1) recurrence: start A^1, then multiply by A^2 each step
  const A2=mul(A,A);
  let Apow=A; // A^(1)

  for(let k=0;k<terms;k++){
    const coeff = ((k%2===0)?1:-1) / (2*k+1);
    sum = add(sum, scale(Apow, coeff));
    Apow = mul(Apow, A2); // next odd power
  }
  return cleanupNegZero(sum);
}

/* exports */
export const config={
  validate(matrices){
    const A=matrices?.[0];
    if(!looksLikeMatrix(A))throw new Error("Please enter Matrix A.");
    const r=A.length,c=A[0].length;
    if(r!==c)throw new Error("Matrix arctan requires a square matrix (n×n).");
    if(r>25)throw new Error("Matrix size too large for matrix arctan.");
    const numA=toNumberMatrix(A);
    for(let i=0;i<r;i++)for(let j=0;j<c;j++){
      if(!Number.isFinite(numA[i][j]))throw new Error("Matrix contains invalid number(s).");
    }
  }
};

export function calculate(matrices,value=""){
  const A=toNumberMatrix(matrices[0]);
  const {terms,bound}=parseParams(value);
  const nrm=normF(A);
  if(nrm >= bound){
    throw new Error(`Matrix arctan series requires ||A|| < ${bound}. Try scaling A or use smaller values.`);
  }
  return arctanSeries(A,terms);
}

export function generateProcessMatrix(){return [];}